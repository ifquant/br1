use crate::models::{RemoteSyncRequest, RemoteSyncResult, SyncSnapshotDocument};
use crate::commands::sync_snapshot::{apply_sync_snapshot_document, load_current_sync_snapshot};
use reqwest::{Client, StatusCode, Url};
use sha2::{Digest, Sha256};
use std::time::Duration;

const READEST_CLOUD_PROVIDER: &str = "readestCloud";
const REMOTE_SYNC_TIMEOUT: Duration = Duration::from_secs(12);

#[derive(Debug, Clone, PartialEq, Eq)]
enum RemoteSyncOperation {
    Push,
    Pull,
}

#[derive(Debug, Clone)]
struct ReadestCloudConfig {
    base_url: Url,
    library_id: String,
    token: String,
}

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct RemoteSnapshotEnvelope {
    snapshot: SyncSnapshotDocument,
}

fn validate_sync_snapshot(snapshot: &SyncSnapshotDocument) -> Result<(), String> {
    if snapshot.records.iter().any(|record| record.id.trim().is_empty()) {
        return Err("Sync snapshot contains a record without an id.".to_string());
    }
    Ok(())
}

fn snapshot_fingerprint(snapshot: &SyncSnapshotDocument) -> Result<String, String> {
    let raw = serde_json::to_vec(snapshot).map_err(|error| error.to_string())?;
    let digest = Sha256::digest(raw);
    Ok(format!("{digest:x}"))
}

fn result_with_status(
    provider: &str,
    operation: &RemoteSyncOperation,
    status: &str,
    message: impl Into<String>,
    retryable: bool,
    local_fingerprint: Option<String>,
    remote_fingerprint: Option<String>,
    remote_exported_at: Option<u64>,
    snapshot: Option<SyncSnapshotDocument>,
) -> RemoteSyncResult {
    RemoteSyncResult {
        provider: provider.to_string(),
        operation: match operation {
            RemoteSyncOperation::Push => "push".to_string(),
            RemoteSyncOperation::Pull => "pull".to_string(),
        },
        status: status.to_string(),
        message: message.into(),
        retryable,
        local_fingerprint,
        remote_fingerprint,
        remote_exported_at,
        snapshot,
        apply_result: None,
        reader_settings_record: None,
    }
}

fn missing_config_result(operation: &RemoteSyncOperation) -> RemoteSyncResult {
    result_with_status(
        READEST_CLOUD_PROVIDER,
        operation,
        "missing-config",
        "Readest Cloud sync is not configured in the desktop environment. Set BR1_READEST_CLOUD_SYNC_BASE_URL, BR1_READEST_CLOUD_SYNC_LIBRARY_ID, and BR1_READEST_CLOUD_SYNC_TOKEN.",
        false,
        None,
        None,
        None,
        None,
    )
}

fn normalize_operation(operation: &str) -> Result<RemoteSyncOperation, String> {
    match operation.trim().to_ascii_lowercase().as_str() {
        "push" => Ok(RemoteSyncOperation::Push),
        "pull" => Ok(RemoteSyncOperation::Pull),
        _ => Err(format!("Unsupported remote sync operation: {operation}")),
    }
}

fn env_value(names: &[&str]) -> Option<String> {
    names.iter()
        .find_map(|name| std::env::var(name).ok())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn resolve_readest_cloud_config() -> Option<ReadestCloudConfig> {
    let base_url = env_value(&[
        "BR1_READEST_CLOUD_SYNC_BASE_URL",
        "BR1_READEST_CLOUD_BASE_URL",
    ])?;
    let library_id = env_value(&[
        "BR1_READEST_CLOUD_SYNC_LIBRARY_ID",
        "BR1_READEST_CLOUD_LIBRARY_ID",
    ])?;
    let token = env_value(&[
        "BR1_READEST_CLOUD_SYNC_TOKEN",
        "BR1_READEST_CLOUD_TOKEN",
    ])?;
    let base_url = Url::parse(&base_url).ok()?;
    Some(ReadestCloudConfig {
        base_url,
        library_id,
        token,
    })
}

fn build_readest_cloud_snapshot_url(config: &ReadestCloudConfig) -> Result<Url, String> {
    let path = format!("v1/libraries/{}/sync-snapshot", config.library_id);
    config.base_url.join(&path).map_err(|error| error.to_string())
}

fn build_http_client() -> Result<Client, String> {
    Client::builder()
        .timeout(REMOTE_SYNC_TIMEOUT)
        .build()
        .map_err(|error| error.to_string())
}

fn is_offline_error(error: &reqwest::Error) -> bool {
    error.is_connect() || error.is_timeout()
}

async fn fetch_remote_snapshot(
    client: &Client,
    config: &ReadestCloudConfig,
    local_fingerprint: Option<String>,
    operation: &RemoteSyncOperation,
) -> Result<Option<(SyncSnapshotDocument, String)>, RemoteSyncResult> {
    let url = build_readest_cloud_snapshot_url(config).map_err(|detail| {
        result_with_status(
            READEST_CLOUD_PROVIDER,
            operation,
            "missing-config",
            format!("Readest Cloud sync endpoint is invalid: {detail}"),
            false,
            local_fingerprint.clone(),
            None,
            None,
            None,
        )
    })?;

    let response = client
        .get(url)
        .bearer_auth(&config.token)
        .send()
        .await
        .map_err(|error| {
            let status = if is_offline_error(&error) {
                "offline"
            } else {
                "retryable-failure"
            };
            result_with_status(
                READEST_CLOUD_PROVIDER,
                operation,
                status,
                if status == "offline" {
                    "Readest Cloud is unreachable right now. Check your connection and try again."
                        .to_string()
                } else {
                    format!("Readest Cloud request failed before receiving a response: {error}")
                },
                true,
                local_fingerprint.clone(),
                None,
                None,
                None,
            )
        })?;

    match response.status() {
        StatusCode::NOT_FOUND => Ok(None),
        StatusCode::OK => {
            let envelope = response.json::<RemoteSnapshotEnvelope>().await.map_err(|error| {
                result_with_status(
                    READEST_CLOUD_PROVIDER,
                    operation,
                    "retryable-failure",
                    format!("Readest Cloud returned an invalid sync payload: {error}"),
                    true,
                    local_fingerprint.clone(),
                    None,
                    None,
                    None,
                )
            })?;
            validate_sync_snapshot(&envelope.snapshot).map_err(|detail| {
                result_with_status(
                    READEST_CLOUD_PROVIDER,
                    operation,
                    "retryable-failure",
                    format!("Readest Cloud returned an unusable sync snapshot: {detail}"),
                    true,
                    local_fingerprint.clone(),
                    None,
                    Some(envelope.snapshot.exported_at),
                    None,
                )
            })?;
            let remote_fingerprint = snapshot_fingerprint(&envelope.snapshot).map_err(|detail| {
                result_with_status(
                    READEST_CLOUD_PROVIDER,
                    operation,
                    "retryable-failure",
                    format!("Failed to hash the Readest Cloud snapshot: {detail}"),
                    true,
                    local_fingerprint.clone(),
                    None,
                    Some(envelope.snapshot.exported_at),
                    None,
                )
            })?;
            Ok(Some((envelope.snapshot, remote_fingerprint)))
        }
        status if status == StatusCode::TOO_MANY_REQUESTS
            || status == StatusCode::REQUEST_TIMEOUT
            || status.is_server_error() =>
        {
            Err(result_with_status(
                READEST_CLOUD_PROVIDER,
                operation,
                "retryable-failure",
                format!(
                    "Readest Cloud sync is temporarily unavailable (HTTP {}).",
                    status.as_u16()
                ),
                true,
                local_fingerprint,
                None,
                None,
                None,
            ))
        }
        status if status == StatusCode::CONFLICT || status == StatusCode::PRECONDITION_FAILED => {
            Err(result_with_status(
                READEST_CLOUD_PROVIDER,
                operation,
                "conflict",
                "Readest Cloud reported a sync conflict for this library snapshot.".to_string(),
                false,
                local_fingerprint,
                None,
                None,
                None,
            ))
        }
        status => Err(result_with_status(
            READEST_CLOUD_PROVIDER,
            operation,
            "retryable-failure",
            format!(
                "Readest Cloud rejected the sync request (HTTP {}).",
                status.as_u16()
            ),
            false,
            local_fingerprint,
            None,
            None,
            None,
        )),
    }
}

async fn upload_remote_snapshot(
    client: &Client,
    config: &ReadestCloudConfig,
    snapshot: &SyncSnapshotDocument,
    local_fingerprint: String,
) -> Result<RemoteSyncResult, RemoteSyncResult> {
    let url = build_readest_cloud_snapshot_url(config).map_err(|detail| {
        result_with_status(
            READEST_CLOUD_PROVIDER,
            &RemoteSyncOperation::Push,
            "missing-config",
            format!("Readest Cloud sync endpoint is invalid: {detail}"),
            false,
            Some(local_fingerprint.clone()),
            None,
            None,
            None,
        )
    })?;

    let response = client
        .put(url)
        .bearer_auth(&config.token)
        .json(&RemoteSnapshotEnvelope {
            snapshot: snapshot.clone(),
        })
        .send()
        .await
        .map_err(|error| {
            let status = if is_offline_error(&error) {
                "offline"
            } else {
                "retryable-failure"
            };
            result_with_status(
                READEST_CLOUD_PROVIDER,
                &RemoteSyncOperation::Push,
                status,
                if status == "offline" {
                    "Readest Cloud is unreachable right now. Check your connection and retry the push."
                        .to_string()
                } else {
                    format!("Readest Cloud push failed before receiving a response: {error}")
                },
                true,
                Some(local_fingerprint.clone()),
                None,
                None,
                None,
            )
        })?;

    match response.status() {
        StatusCode::OK | StatusCode::CREATED => Ok(result_with_status(
            READEST_CLOUD_PROVIDER,
            &RemoteSyncOperation::Push,
            "success",
            format!(
                "Pushed {} sync records to Readest Cloud.",
                snapshot.records.len()
            ),
            false,
            Some(local_fingerprint),
            None,
            Some(snapshot.exported_at),
            None,
        )),
        status if status == StatusCode::CONFLICT || status == StatusCode::PRECONDITION_FAILED => {
            Err(result_with_status(
                READEST_CLOUD_PROVIDER,
                &RemoteSyncOperation::Push,
                "conflict",
                "Readest Cloud already has a different snapshot for this library. Pull first or resolve the divergence from another device."
                    .to_string(),
                false,
                Some(local_fingerprint),
                None,
                None,
                None,
            ))
        }
        status if status == StatusCode::TOO_MANY_REQUESTS
            || status == StatusCode::REQUEST_TIMEOUT
            || status.is_server_error() =>
        {
            Err(result_with_status(
                READEST_CLOUD_PROVIDER,
                &RemoteSyncOperation::Push,
                "retryable-failure",
                format!(
                    "Readest Cloud could not accept the push right now (HTTP {}).",
                    status.as_u16()
                ),
                true,
                Some(local_fingerprint),
                None,
                None,
                None,
            ))
        }
        status => Err(result_with_status(
            READEST_CLOUD_PROVIDER,
            &RemoteSyncOperation::Push,
            "retryable-failure",
            format!("Readest Cloud rejected the push (HTTP {}).", status.as_u16()),
            false,
            Some(local_fingerprint),
            None,
            None,
            None,
        )),
    }
}

async fn run_remote_sync_with_config(
    request: RemoteSyncRequest,
    config: ReadestCloudConfig,
    snapshot: SyncSnapshotDocument,
) -> RemoteSyncResult {
    let operation = match normalize_operation(&request.operation) {
        Ok(operation) => operation,
        Err(detail) => {
            return result_with_status(
                READEST_CLOUD_PROVIDER,
                &RemoteSyncOperation::Push,
                "retryable-failure",
                detail,
                false,
                None,
                None,
                None,
                None,
            )
        }
    };

    if request.provider != READEST_CLOUD_PROVIDER {
        return result_with_status(
            READEST_CLOUD_PROVIDER,
            &operation,
            "retryable-failure",
            format!("Unsupported remote sync provider: {}", request.provider),
            false,
            None,
            None,
            None,
            None,
        );
    }

    if let Err(detail) = validate_sync_snapshot(&snapshot) {
        return result_with_status(
            READEST_CLOUD_PROVIDER,
            &operation,
            "retryable-failure",
            detail,
            false,
            None,
            None,
            None,
            None,
        );
    }

    let local_fingerprint = match snapshot_fingerprint(&snapshot) {
        Ok(fingerprint) => fingerprint,
        Err(detail) => {
            return result_with_status(
                READEST_CLOUD_PROVIDER,
                &operation,
                "retryable-failure",
                format!("Failed to hash the local sync snapshot: {detail}"),
                false,
                None,
                None,
                None,
                None,
            )
        }
    };

    let client = match build_http_client() {
        Ok(client) => client,
        Err(detail) => {
            return result_with_status(
                READEST_CLOUD_PROVIDER,
                &operation,
                "retryable-failure",
                format!("Failed to start the Readest Cloud HTTP client: {detail}"),
                true,
                Some(local_fingerprint),
                None,
                None,
                None,
            )
        }
    };

    match operation {
        RemoteSyncOperation::Push => {
            let remote = match fetch_remote_snapshot(
                &client,
                &config,
                Some(local_fingerprint.clone()),
                &operation,
            )
            .await
            {
                Ok(remote) => remote,
                Err(result) => return result,
            };

            if let Some((remote_snapshot, remote_fingerprint)) = remote {
                if remote_fingerprint == local_fingerprint {
                    return result_with_status(
                        READEST_CLOUD_PROVIDER,
                        &operation,
                        "success",
                        "Readest Cloud already matches the current local snapshot.".to_string(),
                        false,
                        Some(local_fingerprint),
                        Some(remote_fingerprint),
                        Some(remote_snapshot.exported_at),
                        None,
                    );
                }

                return result_with_status(
                    READEST_CLOUD_PROVIDER,
                    &operation,
                    "conflict",
                    "Readest Cloud contains a different snapshot. Pull the remote snapshot before pushing again."
                        .to_string(),
                    false,
                    Some(local_fingerprint),
                    Some(remote_fingerprint),
                    Some(remote_snapshot.exported_at),
                    None,
                );
            }

            match upload_remote_snapshot(&client, &config, &snapshot, local_fingerprint).await {
                Ok(result) | Err(result) => result,
            }
        }
        RemoteSyncOperation::Pull => {
            let remote = match fetch_remote_snapshot(
                &client,
                &config,
                Some(local_fingerprint.clone()),
                &operation,
            )
            .await
            {
                Ok(remote) => remote,
                Err(result) => return result,
            };

            let Some((remote_snapshot, remote_fingerprint)) = remote else {
                return result_with_status(
                    READEST_CLOUD_PROVIDER,
                    &operation,
                    "empty",
                    "Readest Cloud does not have a snapshot for this library yet.".to_string(),
                    false,
                    Some(local_fingerprint),
                    None,
                    None,
                    None,
                );
            };

            if remote_fingerprint == local_fingerprint {
                return result_with_status(
                    READEST_CLOUD_PROVIDER,
                    &operation,
                    "success",
                    "Local data already matches the Readest Cloud snapshot.".to_string(),
                    false,
                    Some(local_fingerprint),
                    Some(remote_fingerprint),
                    Some(remote_snapshot.exported_at),
                    None,
                );
            }

            result_with_status(
                READEST_CLOUD_PROVIDER,
                &operation,
                "success",
                format!(
                    "Pulled {} sync records from Readest Cloud.",
                    remote_snapshot.records.len()
                ),
                false,
                Some(local_fingerprint),
                Some(remote_fingerprint),
                Some(remote_snapshot.exported_at),
                Some(remote_snapshot),
            )
        }
    }
}

#[tauri::command]
pub(crate) async fn run_remote_sync(
    app: tauri::AppHandle,
    request: RemoteSyncRequest,
) -> Result<RemoteSyncResult, String> {
    let operation = normalize_operation(&request.operation)?;
    let Some(config) = resolve_readest_cloud_config() else {
        return Ok(missing_config_result(&operation));
    };
    let snapshot = load_current_sync_snapshot(&app)?;
    let mut result = run_remote_sync_with_config(request, config, snapshot).await;
    if operation == RemoteSyncOperation::Pull && result.status == "success" {
        if let Some(snapshot) = result.snapshot.clone() {
            let (apply_result, reader_settings_record) = apply_sync_snapshot_document(&app, &snapshot)?;
            result.apply_result = Some(apply_result);
            result.reader_settings_record = reader_settings_record;
            result.snapshot = None;
        }
    }
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::{
        resolve_readest_cloud_config, run_remote_sync_with_config, ReadestCloudConfig,
        RemoteSnapshotEnvelope, READEST_CLOUD_PROVIDER,
    };
    use crate::models::{RemoteSyncRequest, SyncSnapshotDocument, SyncSnapshotRecord};
    use reqwest::Url;
    use std::io::{Read, Write};
    use std::net::{SocketAddr, TcpListener};
    use std::sync::{Mutex, OnceLock};
    use std::thread;

    fn env_lock() -> &'static Mutex<()> {
        static LOCK: OnceLock<Mutex<()>> = OnceLock::new();
        LOCK.get_or_init(|| Mutex::new(()))
    }

    fn sample_snapshot(exported_at: u64, title: &str) -> SyncSnapshotDocument {
        SyncSnapshotDocument {
            schema_version: 1,
            exported_at,
            records: vec![SyncSnapshotRecord {
                schema_version: 1,
                kind: "library-book".to_string(),
                id: "library-book:book-1".to_string(),
                updated_at: exported_at,
                scope: Some(serde_json::json!({ "bookId": "book-1" })),
                payload: serde_json::json!({
                    "id": "book-1",
                    "title": title,
                    "author": "Tester",
                    "format": "EPUB",
                    "description": null,
                    "language": "en",
                    "publisher": null,
                    "collection": null,
                    "tags": [],
                    "filePath": "/books/book-1.epub",
                    "coverPath": null,
                    "sourcePath": null,
                    "importedAt": exported_at,
                    "libraryFileExists": true,
                    "sourceFileExists": true
                }),
            }],
        }
    }

    fn sample_request(operation: &str) -> RemoteSyncRequest {
        RemoteSyncRequest {
            provider: READEST_CLOUD_PROVIDER.to_string(),
            operation: operation.to_string(),
        }
    }

    fn start_test_server(responses: Vec<String>) -> SocketAddr {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();

        thread::spawn(move || {
            for response in responses {
                let (mut stream, _) = listener.accept().unwrap();
                let mut buffer = [0u8; 8192];
                let _ = stream.read(&mut buffer);
                stream.write_all(response.as_bytes()).unwrap();
                stream.flush().unwrap();
            }
        });

        addr
    }

    fn http_response(status: &str, body: &str) -> String {
        format!(
            "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
            body.len()
        )
    }

    #[test]
    fn missing_config_is_reported_without_throwing() {
        let _guard = env_lock().lock().unwrap();
        std::env::remove_var("BR1_READEST_CLOUD_SYNC_BASE_URL");
        std::env::remove_var("BR1_READEST_CLOUD_BASE_URL");
        std::env::remove_var("BR1_READEST_CLOUD_SYNC_LIBRARY_ID");
        std::env::remove_var("BR1_READEST_CLOUD_LIBRARY_ID");
        std::env::remove_var("BR1_READEST_CLOUD_SYNC_TOKEN");
        std::env::remove_var("BR1_READEST_CLOUD_TOKEN");

        assert!(resolve_readest_cloud_config().is_none());
    }

    #[test]
    fn push_uploads_when_remote_snapshot_is_missing() {
        let local = sample_snapshot(100, "Local");
        let server = start_test_server(vec![
            http_response("404 Not Found", "{}"),
            http_response("200 OK", "{}"),
        ]);
        let config = ReadestCloudConfig {
            base_url: Url::parse(&format!("http://{server}/")).unwrap(),
            library_id: "alpha".to_string(),
            token: "secret".to_string(),
        };

        let result = tauri::async_runtime::block_on(run_remote_sync_with_config(
            sample_request("push"),
            config,
            local.clone(),
        ));

        assert_eq!(result.status, "success");
        assert!(result.message.contains("Pushed 1 sync records"));
        assert_eq!(result.remote_exported_at, Some(local.exported_at));
    }

    #[test]
    fn push_reports_conflict_when_remote_snapshot_diverges() {
        let local = sample_snapshot(100, "Local");
        let remote = sample_snapshot(200, "Remote");
        let body = serde_json::to_string(&RemoteSnapshotEnvelope {
            snapshot: remote.clone(),
        })
        .unwrap();
        let server = start_test_server(vec![http_response("200 OK", &body)]);
        let config = ReadestCloudConfig {
            base_url: Url::parse(&format!("http://{server}/")).unwrap(),
            library_id: "alpha".to_string(),
            token: "secret".to_string(),
        };

        let result = tauri::async_runtime::block_on(run_remote_sync_with_config(
            sample_request("push"),
            config,
            local,
        ));

        assert_eq!(result.status, "conflict");
        assert_eq!(result.remote_exported_at, Some(remote.exported_at));
        assert!(result.remote_fingerprint.is_some());
    }

    #[test]
    fn pull_reports_offline_when_provider_is_unreachable() {
        let listener = TcpListener::bind("127.0.0.1:0").unwrap();
        let addr = listener.local_addr().unwrap();
        drop(listener);

        let config = ReadestCloudConfig {
            base_url: Url::parse(&format!("http://{addr}/")).unwrap(),
            library_id: "alpha".to_string(),
            token: "secret".to_string(),
        };

        let result = tauri::async_runtime::block_on(run_remote_sync_with_config(
            sample_request("pull"),
            config,
            sample_snapshot(100, "Local"),
        ));

        assert_eq!(result.status, "offline");
        assert!(result.retryable);
    }

    #[test]
    fn pull_reports_retryable_failures_for_server_errors() {
        let server = start_test_server(vec![http_response("503 Service Unavailable", "{}")]);
        let config = ReadestCloudConfig {
            base_url: Url::parse(&format!("http://{server}/")).unwrap(),
            library_id: "alpha".to_string(),
            token: "secret".to_string(),
        };

        let result = tauri::async_runtime::block_on(run_remote_sync_with_config(
            sample_request("pull"),
            config,
            sample_snapshot(100, "Local"),
        ));

        assert_eq!(result.status, "retryable-failure");
        assert!(result.retryable);
    }
}
