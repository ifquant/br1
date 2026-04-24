use crate::models::{
    KoReaderRemoteProgressEntry, KoReaderRemoteSyncRequest, KoReaderRemoteSyncResult,
    LibraryBookRecord,
};
use crate::util::{ensure_library_root, library_json_path, load_library_records};
use reqwest::{Client, StatusCode, Url};
use std::time::Duration;

const KOREADER_REMOTE_SYNC_TIMEOUT: Duration = Duration::from_secs(15);
const KO_READER_XPOINTER_PREFIX: &str = "/body/DocFragment[";
const EPUB_CFI_PREFIX: &str = "epubcfi(";
const PLAIN_TEXT_PROGRESS_PREFIX: &str = "txt:";

#[derive(Debug, Clone, PartialEq, Eq)]
enum KoReaderRemoteSyncOperation {
    Push,
    Pull,
}

#[derive(Debug, Clone)]
struct KoReaderRemoteSyncConfig {
    base_url: Url,
    username: String,
    userkey: String,
    device_name: String,
    device_id: String,
}

#[derive(Debug, Clone, serde::Serialize)]
struct KoReaderProgressPushPayload<'a> {
    document: &'a str,
    progress: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    percentage: Option<f64>,
    device: &'a str,
    device_id: &'a str,
}

#[derive(Debug, Clone, serde::Deserialize)]
struct KoReaderProgressPullPayload {
    #[allow(dead_code)]
    document: Option<String>,
    progress: Option<String>,
    percentage: Option<f64>,
    timestamp: Option<u64>,
    device: Option<String>,
    device_id: Option<String>,
}

fn normalize_operation(operation: &str) -> Result<KoReaderRemoteSyncOperation, String> {
    match operation.trim().to_ascii_lowercase().as_str() {
        "push" => Ok(KoReaderRemoteSyncOperation::Push),
        "pull" => Ok(KoReaderRemoteSyncOperation::Pull),
        _ => Err(format!("Unsupported KOReader remote sync operation: {operation}")),
    }
}

fn env_value(names: &[&str]) -> Option<String> {
    names.iter()
        .find_map(|name| std::env::var(name).ok())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn resolve_config() -> Option<KoReaderRemoteSyncConfig> {
    let base_url = env_value(&[
        "BR1_KOREADER_SYNC_BASE_URL",
        "BR1_KOREADER_SYNC_SERVER_URL",
        "BR1_KOSYNC_BASE_URL",
    ])?;
    let username = env_value(&["BR1_KOREADER_SYNC_USERNAME", "BR1_KOSYNC_USERNAME"])?;
    let userkey = env_value(&["BR1_KOREADER_SYNC_USERKEY", "BR1_KOSYNC_USERKEY"])?;
    let mut base_url = Url::parse(&base_url).ok()?;
    if !base_url.path().ends_with('/') {
        let next_path = format!("{}/", base_url.path());
        base_url.set_path(&next_path);
    }

    Some(KoReaderRemoteSyncConfig {
        base_url,
        username,
        userkey,
        device_name: env_value(&["BR1_KOREADER_SYNC_DEVICE_NAME", "BR1_KOSYNC_DEVICE_NAME"])
            .unwrap_or_else(|| "br1 desktop".to_string()),
        device_id: env_value(&["BR1_KOREADER_SYNC_DEVICE_ID", "BR1_KOSYNC_DEVICE_ID"])
            .unwrap_or_else(|| "br1-desktop".to_string()),
    })
}

fn build_http_client() -> Result<Client, String> {
    Client::builder()
        .timeout(KOREADER_REMOTE_SYNC_TIMEOUT)
        .build()
        .map_err(|error| error.to_string())
}

fn is_offline_error(error: &reqwest::Error) -> bool {
    error.is_connect() || error.is_timeout()
}

fn result_with_status(
    operation: &KoReaderRemoteSyncOperation,
    status: &str,
    message: impl Into<String>,
    retryable: bool,
    pushed_count: usize,
    pulled_count: usize,
    skipped_count: usize,
    entries: Vec<KoReaderRemoteProgressEntry>,
) -> KoReaderRemoteSyncResult {
    KoReaderRemoteSyncResult {
        operation: match operation {
            KoReaderRemoteSyncOperation::Push => "push".to_string(),
            KoReaderRemoteSyncOperation::Pull => "pull".to_string(),
        },
        status: status.to_string(),
        message: message.into(),
        retryable,
        pushed_count,
        pulled_count,
        skipped_count,
        entries,
    }
}

fn missing_config_result(operation: &KoReaderRemoteSyncOperation) -> KoReaderRemoteSyncResult {
    result_with_status(
        operation,
        "missing-config",
        "KOReader server sync is not configured in the desktop environment. Set BR1_KOREADER_SYNC_BASE_URL, BR1_KOREADER_SYNC_USERNAME, and BR1_KOREADER_SYNC_USERKEY.",
        false,
        0,
        0,
        0,
        Vec::new(),
    )
}

fn auth_failure_result(
    operation: &KoReaderRemoteSyncOperation,
    message: impl Into<String>,
) -> KoReaderRemoteSyncResult {
    result_with_status(
        operation,
        "auth-failure",
        message,
        false,
        0,
        0,
        0,
        Vec::new(),
    )
}

fn build_endpoint(config: &KoReaderRemoteSyncConfig, path: &str) -> Result<Url, String> {
    config.base_url.join(path).map_err(|error| error.to_string())
}

fn build_progress_entry_url(
    config: &KoReaderRemoteSyncConfig,
    document: &str,
) -> Result<Url, String> {
    let mut url = build_endpoint(config, "syncs/progress")?;
    {
        let mut segments = url
            .path_segments_mut()
            .map_err(|_| "KOReader progress endpoint is invalid.".to_string())?;
        segments.push(document);
    }
    Ok(url)
}

fn hash_identity_part(value: &str) -> String {
    let mut hash = 0x811c9dc5u32;
    for byte in value.bytes() {
        hash ^= byte as u32;
        hash = hash.wrapping_mul(0x01000193);
    }
    format!("{hash:08x}")
}

fn derive_document_hash(book: &LibraryBookRecord) -> String {
    hash_identity_part(
        book.source_path
            .as_deref()
            .filter(|value| !value.trim().is_empty())
            .unwrap_or(book.file_path.as_str())
            .trim(),
    )
}

fn normalize_progress_label(value: &str) -> String {
    value.trim().to_string()
}

fn is_koreader_locator(value: &str) -> bool {
    value.starts_with(KO_READER_XPOINTER_PREFIX) || value.starts_with(EPUB_CFI_PREFIX)
}

fn is_page_progress(value: &str) -> bool {
    let Some(inner) = value.strip_prefix('[').and_then(|value| value.strip_suffix(']')) else {
        return false;
    };
    let Some((current, total)) = inner.split_once(',') else {
        return false;
    };
    current.trim().parse::<u64>().is_ok() && total.trim().parse::<u64>().map(|value| value > 0).unwrap_or(false)
}

fn to_percent(value: Option<f64>) -> Option<f64> {
    let value = value?;
    if !value.is_finite() {
        return None;
    }
    Some((value.clamp(0.0, 1.0) * 10000.0).round() / 100.0)
}

fn to_koreader_remote_progress_value(book: &LibraryBookRecord) -> String {
    let koreader_location = book
        .koreader_progress_location
        .as_deref()
        .unwrap_or("")
        .trim()
        .to_string();
    if !koreader_location.is_empty() && is_koreader_locator(&koreader_location) {
        return koreader_location;
    }

    let location = book
        .progress_location
        .as_deref()
        .unwrap_or("")
        .trim()
        .to_string();
    if is_koreader_locator(&location) {
        return location;
    }

    if location.starts_with(PLAIN_TEXT_PROGRESS_PREFIX) {
        return String::new();
    }

    let label = normalize_progress_label(&book.progress);
    if is_page_progress(&label) || label.chars().all(|char| char.is_ascii_digit()) {
        return label;
    }

    String::new()
}

fn load_current_progress_entries(
    app: &tauri::AppHandle,
) -> Result<Vec<KoReaderRemoteProgressEntry>, String> {
    ensure_library_root(app)?;
    let library_json = library_json_path(app)?;
    let library_books = load_library_records(&library_json)?;
    let mut entries = Vec::new();

    for book in library_books {
        let progress = to_koreader_remote_progress_value(&book);
        let timestamp = book.last_opened_at.unwrap_or(book.imported_at);
        if progress.is_empty() || timestamp == 0 {
            continue;
        }

        entries.push(KoReaderRemoteProgressEntry {
            schema_version: 1,
            book_id: book.id.clone(),
            file_path: book.file_path.clone(),
            source_path: book.source_path.clone(),
            title: book.title.clone(),
            author: book.author.clone(),
            format: book.format.clone(),
            document: derive_document_hash(&book),
            progress,
            percentage: to_percent(book.progress_fraction),
            timestamp,
            device: None,
            device_id: None,
        });
    }

    Ok(entries)
}

async fn authenticate(
    client: &Client,
    config: &KoReaderRemoteSyncConfig,
    operation: &KoReaderRemoteSyncOperation,
) -> Result<(), KoReaderRemoteSyncResult> {
    let url = build_endpoint(config, "users/auth").map_err(|detail| {
        result_with_status(
            operation,
            "missing-config",
            format!("KOReader server URL is invalid: {detail}"),
            false,
            0,
            0,
            0,
            Vec::new(),
        )
    })?;

    let response = client
        .get(url)
        .header("accept", "application/vnd.koreader.v1+json")
        .header("X-Auth-User", &config.username)
        .header("X-Auth-Key", &config.userkey)
        .send()
        .await
        .map_err(|error| {
            let status = if is_offline_error(&error) {
                "offline"
            } else {
                "retryable-failure"
            };
            result_with_status(
                operation,
                status,
                if status == "offline" {
                    "KOReader server is unreachable right now. Check the network and try again."
                        .to_string()
                } else {
                    format!("KOReader auth request failed before receiving a response: {error}")
                },
                true,
                0,
                0,
                0,
                Vec::new(),
            )
        })?;

    match response.status() {
        StatusCode::OK => Ok(()),
        StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => Err(auth_failure_result(
            operation,
            "KOReader server rejected the configured username or user key.",
        )),
        status if status.is_server_error() || status == StatusCode::TOO_MANY_REQUESTS => {
            Err(result_with_status(
                operation,
                "retryable-failure",
                format!(
                    "KOReader auth is temporarily unavailable (HTTP {}).",
                    status.as_u16()
                ),
                true,
                0,
                0,
                0,
                Vec::new(),
            ))
        }
        status => Err(auth_failure_result(
            operation,
            format!("KOReader auth failed with HTTP {}.", status.as_u16()),
        )),
    }
}

async fn push_progress_entries(
    client: &Client,
    config: &KoReaderRemoteSyncConfig,
    entries: &[KoReaderRemoteProgressEntry],
    operation: &KoReaderRemoteSyncOperation,
) -> Result<KoReaderRemoteSyncResult, KoReaderRemoteSyncResult> {
    let url = build_endpoint(config, "syncs/progress").map_err(|detail| {
        result_with_status(
            operation,
            "missing-config",
            format!("KOReader progress endpoint is invalid: {detail}"),
            false,
            0,
            0,
            entries.len(),
            Vec::new(),
        )
    })?;

    let mut pushed_count = 0usize;
    for entry in entries {
        let payload = KoReaderProgressPushPayload {
            document: &entry.document,
            progress: &entry.progress,
            percentage: entry.percentage,
            device: &config.device_name,
            device_id: &config.device_id,
        };

        let response = client
            .put(url.clone())
            .header("accept", "application/vnd.koreader.v1+json")
            .header("Content-Type", "application/json")
            .header("X-Auth-User", &config.username)
            .header("X-Auth-Key", &config.userkey)
            .json(&payload)
            .send()
            .await
            .map_err(|error| {
                let status = if is_offline_error(&error) {
                    "offline"
                } else {
                    "retryable-failure"
                };
                result_with_status(
                    operation,
                    status,
                    if status == "offline" {
                        "KOReader server is unreachable right now. Check the network and try again."
                            .to_string()
                    } else {
                        format!("KOReader progress push failed before receiving a response: {error}")
                    },
                    true,
                    pushed_count,
                    0,
                    entries.len().saturating_sub(pushed_count),
                    Vec::new(),
                )
            })?;

        let status = response.status();
        if !status.is_success() {
            return Err(match status {
                StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => auth_failure_result(
                    operation,
                    "KOReader server rejected the configured username or user key.",
                ),
                status if status.is_server_error() || status == StatusCode::TOO_MANY_REQUESTS => {
                    result_with_status(
                        operation,
                        "retryable-failure",
                        format!(
                            "KOReader progress push is temporarily unavailable (HTTP {}).",
                            status.as_u16()
                        ),
                        true,
                        pushed_count,
                        0,
                        entries.len().saturating_sub(pushed_count),
                        Vec::new(),
                    )
                }
                _ => result_with_status(
                    operation,
                    "retryable-failure",
                    format!(
                        "KOReader progress push failed with HTTP {}.",
                        status.as_u16()
                    ),
                    false,
                    pushed_count,
                    0,
                    entries.len().saturating_sub(pushed_count),
                    Vec::new(),
                ),
            });
        }

        pushed_count += 1;
    }

    Ok(result_with_status(
        operation,
        "success",
        format!("已将 {pushed_count} 本图书的阅读进度推送到 KOReader 服务端。"),
        false,
        pushed_count,
        0,
        entries.len().saturating_sub(pushed_count),
        Vec::new(),
    ))
}

async fn pull_progress_entries(
    client: &Client,
    config: &KoReaderRemoteSyncConfig,
    entries: &[KoReaderRemoteProgressEntry],
    operation: &KoReaderRemoteSyncOperation,
) -> Result<KoReaderRemoteSyncResult, KoReaderRemoteSyncResult> {
    let mut pulled_entries = Vec::new();
    let mut skipped_count = 0usize;

    for entry in entries {
        let url = build_progress_entry_url(config, &entry.document).map_err(
            |detail| {
                result_with_status(
                    operation,
                    "missing-config",
                    format!("KOReader progress endpoint is invalid: {detail}"),
                    false,
                    0,
                    0,
                    entries.len(),
                    Vec::new(),
                )
            },
        )?;

        let response = client
            .get(url)
            .header("accept", "application/vnd.koreader.v1+json")
            .header("X-Auth-User", &config.username)
            .header("X-Auth-Key", &config.userkey)
            .send()
            .await
            .map_err(|error| {
                let status = if is_offline_error(&error) {
                    "offline"
                } else {
                    "retryable-failure"
                };
                result_with_status(
                    operation,
                    status,
                    if status == "offline" {
                        "KOReader server is unreachable right now. Check the network and try again."
                            .to_string()
                    } else {
                        format!("KOReader progress pull failed before receiving a response: {error}")
                    },
                    true,
                    0,
                    pulled_entries.len(),
                    entries.len().saturating_sub(pulled_entries.len()),
                    Vec::new(),
                )
            })?;

        match response.status() {
            StatusCode::OK => {
                let payload = response.json::<KoReaderProgressPullPayload>().await.map_err(|error| {
                    result_with_status(
                        operation,
                        "retryable-failure",
                        format!("KOReader server returned an invalid progress payload: {error}"),
                        true,
                        0,
                        pulled_entries.len(),
                        entries.len().saturating_sub(pulled_entries.len()),
                        Vec::new(),
                    )
                })?;
                let timestamp = payload.timestamp.unwrap_or(entry.timestamp);
                let progress = payload.progress.unwrap_or_else(|| entry.progress.clone());
                if progress.trim().is_empty() {
                    skipped_count += 1;
                    continue;
                }
                let mut merged = entry.clone();
                merged.progress = progress;
                merged.percentage = payload.percentage;
                merged.timestamp = timestamp;
                merged.device = payload.device;
                merged.device_id = payload.device_id;
                pulled_entries.push(merged);
            }
            StatusCode::NOT_FOUND => {
                skipped_count += 1;
            }
            StatusCode::UNAUTHORIZED | StatusCode::FORBIDDEN => {
                return Err(auth_failure_result(
                    operation,
                    "KOReader server rejected the configured username or user key.",
                ));
            }
            status if status.is_server_error() || status == StatusCode::TOO_MANY_REQUESTS => {
                return Err(result_with_status(
                    operation,
                    "retryable-failure",
                    format!(
                        "KOReader progress pull is temporarily unavailable (HTTP {}).",
                        status.as_u16()
                    ),
                    true,
                    0,
                    pulled_entries.len(),
                    entries.len().saturating_sub(pulled_entries.len()),
                    Vec::new(),
                ));
            }
            status => {
                return Err(result_with_status(
                    operation,
                    "retryable-failure",
                    format!("KOReader progress pull failed with HTTP {}.", status.as_u16()),
                    false,
                    0,
                    pulled_entries.len(),
                    entries.len().saturating_sub(pulled_entries.len()),
                    Vec::new(),
                ));
            }
        }
    }

    if pulled_entries.is_empty() {
        return Ok(result_with_status(
            operation,
            "empty",
            "KOReader 服务端没有返回可应用的阅读进度。",
            false,
            0,
            0,
            skipped_count,
            Vec::new(),
        ));
    }

    Ok(result_with_status(
        operation,
        "success",
        format!("已从 KOReader 服务端拉取 {count} 本图书的阅读进度。", count = pulled_entries.len()),
        false,
        0,
        pulled_entries.len(),
        skipped_count,
        pulled_entries,
    ))
}

#[tauri::command]
pub(crate) async fn run_koreader_remote_sync(
    app: tauri::AppHandle,
    request: KoReaderRemoteSyncRequest,
) -> Result<KoReaderRemoteSyncResult, String> {
    let operation = normalize_operation(&request.operation)?;
    let Some(config) = resolve_config() else {
        return Ok(missing_config_result(&operation));
    };
    let client = build_http_client()?;

    if let Err(result) = authenticate(&client, &config, &operation).await {
        return Ok(result);
    }

    let entries = load_current_progress_entries(&app)?;
    let result = match operation {
        KoReaderRemoteSyncOperation::Push => {
            push_progress_entries(&client, &config, &entries, &operation).await
        }
        KoReaderRemoteSyncOperation::Pull => {
            pull_progress_entries(&client, &config, &entries, &operation).await
        }
    };

    Ok(match result {
        Ok(result) => result,
        Err(result) => result,
    })
}
