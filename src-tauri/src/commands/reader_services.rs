// Ownership: this module is the desktop execution layer for lookup and
// translation providers. Renderer code may pick provider and text, but API
// credentials, timeouts, and external payload normalization stay owned here.

use crate::util::now_millis;
use reqwest::Url;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Duration;

const WIKIPEDIA_PROJECT_ALLOWLIST: &[&str] = &[
    "ar", "cs", "de", "en", "es", "fa", "fi", "fr", "he", "hu", "id", "it", "ja", "ko", "nl", "no",
    "pl", "pt", "ru", "sv", "tr", "uk", "vi", "zh",
];
const WIKIPEDIA_LOOKUP_TERM_LIMIT: usize = 120;
const WIKIPEDIA_LOOKUP_BODY_LIMIT: usize = 1500;
const WIKIPEDIA_LOOKUP_TIMEOUT: Duration = Duration::from_secs(8);
const DICTIONARY_LOOKUP_BODY_LIMIT: usize = 1500;
const TRANSLATION_TEXT_LIMIT: usize = 8_000;
const TRANSLATION_RESULT_BODY_LIMIT: usize = 4_000;
const TRANSLATION_TIMEOUT: Duration = Duration::from_secs(12);
const TRANSLATION_PROVIDER_NAMES: &[&str] = &["deepl", "yandex"];
const DEEPL_TRANSLATE_API_ENDPOINT: &str = "https://api.deepl.com/v2/translate";
const DEEPL_TRANSLATE_API_FREE_ENDPOINT: &str = "https://api-free.deepl.com/v2/translate";
const YANDEX_TRANSLATE_API_ENDPOINT: &str =
    "https://translate.api.cloud.yandex.net/translate/v2/translate";

// Boundary: provider constants and size limits stay centralized here so
// renderer-facing workflows cannot diverge from actual backend constraints.

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReaderAssistanceLookupRequest {
    pub provider: String,
    pub term: String,
    pub language: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReaderAssistanceLookupResult {
    pub id: String,
    pub provider: String,
    pub title: String,
    pub body: String,
    pub url: Option<String>,
    pub source_label: Option<String>,
    pub created_at: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReaderAssistanceLookupResponse {
    pub status: ReaderAssistanceLookupStatus,
    pub result: Option<ReaderAssistanceLookupResult>,
    pub error: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReaderTranslationProviderSettingsInput {
    pub provider: String,
    pub label: Option<String>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReaderAssistanceTranslationRequest {
    pub provider: String,
    pub text: String,
    pub source_language: Option<String>,
    pub target_language: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct ReaderTranslationProviderStatus {
    pub provider: String,
    pub status: ReaderTranslationProviderStatusKind,
    pub configured: bool,
    pub label: String,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredReaderTranslationProviderSettings {
    provider: String,
    configured: bool,
    label: String,
    updated_at: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum ReaderTranslationProviderStatusKind {
    Configured,
    MissingKey,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "lowercase")]
pub(crate) enum ReaderAssistanceLookupStatus {
    Ready,
    Empty,
    Offline,
    Error,
}

#[allow(dead_code)]
#[derive(Debug, Deserialize)]
struct WikipediaOpenSearchResponse(String, Vec<String>, Vec<String>, Vec<String>);

#[derive(Debug, Deserialize)]
struct WikipediaQueryResponse {
    query: WikipediaQueryPages,
}

#[derive(Debug, Deserialize)]
struct WikipediaQueryPages {
    pages: HashMap<String, WikipediaQueryPage>,
}

#[derive(Debug, Deserialize)]
struct WikipediaQueryPage {
    title: Option<String>,
    extract: Option<String>,
    fullurl: Option<String>,
}

#[derive(Debug, Deserialize)]
struct DictionaryEntryResponse {
    word: String,
    #[serde(default)]
    phonetic: Option<String>,
    #[serde(default)]
    phonetics: Vec<DictionaryPhonetic>,
    #[serde(default)]
    origin: Option<String>,
    #[serde(default)]
    meanings: Vec<DictionaryMeaning>,
}

#[derive(Debug, Deserialize)]
struct DictionaryPhonetic {
    text: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DictionaryMeaning {
    part_of_speech: Option<String>,
    #[serde(default)]
    definitions: Vec<DictionaryDefinition>,
}

#[derive(Debug, Deserialize)]
struct DictionaryDefinition {
    definition: String,
    example: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeepLTranslationResponse {
    #[serde(default)]
    translations: Vec<DeepLTranslationEntry>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DeepLTranslationEntry {
    text: String,
    detected_source_language: Option<String>,
}

#[derive(Debug, Deserialize)]
struct DeepLErrorResponse {
    message: Option<String>,
    detail: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct YandexTranslationResponse {
    #[serde(default)]
    translations: Vec<YandexTranslationEntry>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct YandexTranslationEntry {
    text: String,
    detected_language_code: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct YandexErrorResponse {
    message: Option<String>,
    details: Option<Vec<YandexErrorDetail>>,
    error: Option<String>,
    description: Option<String>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct YandexErrorDetail {
    message: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
enum YandexAuthMode {
    ApiKey,
    Bearer,
}

#[derive(Debug, Clone, PartialEq, Eq)]
struct YandexTranslationConfig {
    auth_mode: YandexAuthMode,
    auth_token: String,
    folder_id: String,
}

#[derive(Debug, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
struct YandexTranslateRequestBody {
    folder_id: String,
    texts: Vec<String>,
    target_language_code: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    source_language_code: Option<String>,
}

fn normalize_wikipedia_project(language: Option<&str>) -> String {
    let candidate = language
        .unwrap_or("en")
        .trim()
        .to_ascii_lowercase()
        .replace('_', "-");
    let primary = candidate.split('-').next().unwrap_or("en");

    if WIKIPEDIA_PROJECT_ALLOWLIST.contains(&primary) {
        return primary.to_string();
    }

    if primary.starts_with("zh") {
        return "zh".to_string();
    }

    "en".to_string()
}

fn normalize_lookup_term(term: &str) -> String {
    term.split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .chars()
        .take(WIKIPEDIA_LOOKUP_TERM_LIMIT)
        .collect()
}

fn normalize_translation_text(text: &str) -> String {
    text.split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .chars()
        .take(TRANSLATION_TEXT_LIMIT)
        .collect()
}

fn normalize_translation_language(language: Option<&str>) -> Option<String> {
    let normalized = language?.trim().replace('_', "-").to_ascii_uppercase();

    if normalized.is_empty() {
        return None;
    }

    Some(normalized)
}

fn normalize_dictionary_language(language: Option<&str>) -> String {
    let candidate = language
        .unwrap_or("en")
        .trim()
        .to_ascii_lowercase()
        .replace('_', "-");
    let primary = candidate.split('-').next().unwrap_or("en");

    if primary == "en" {
        return "en".to_string();
    }

    "en".to_string()
}

fn normalize_wikipedia_text(value: &str, limit: usize) -> String {
    value
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .chars()
        .take(limit)
        .collect()
}

fn build_wikipedia_api_url(project: &str, query: &[(&str, &str)]) -> Result<Url, String> {
    let base = format!("https://{project}.wikipedia.org/w/api.php");
    Url::parse_with_params(&base, query).map_err(|error| error.to_string())
}

fn build_dictionary_api_url(language: &str, term: &str) -> Result<Url, String> {
    let mut url = Url::parse(&format!(
        "https://api.dictionaryapi.dev/api/v2/entries/{language}/"
    ))
    .map_err(|error| error.to_string())?;
    {
        let mut segments = url
            .path_segments_mut()
            .map_err(|_| "invalid dictionary endpoint".to_string())?;
        segments.pop_if_empty();
        segments.push(term);
    }
    Ok(url)
}

fn build_wikipedia_article_url(project: &str, title: &str) -> Option<String> {
    let mut url = Url::parse(&format!("https://{project}.wikipedia.org/wiki/")).ok()?;
    {
        let mut segments = url.path_segments_mut().ok()?;
        segments.pop_if_empty();
        segments.push(&title.replace(' ', "_"));
    }
    Some(url.to_string())
}

fn build_lookup_response(
    project: &str,
    normalized_term: &str,
    title: &str,
    body: &str,
    url: Option<String>,
) -> ReaderAssistanceLookupResponse {
    let created_at = now_millis().unwrap_or_default();
    let term_slug = normalized_term
        .split_whitespace()
        .collect::<Vec<_>>()
        .join("-")
        .chars()
        .take(24)
        .collect::<String>();
    ReaderAssistanceLookupResponse {
        status: ReaderAssistanceLookupStatus::Ready,
        result: Some(ReaderAssistanceLookupResult {
            id: format!("wikipedia:{project}:{term_slug}:{created_at}"),
            provider: "wikipedia".to_string(),
            title: title.to_string(),
            body: normalize_wikipedia_text(body, WIKIPEDIA_LOOKUP_BODY_LIMIT),
            url,
            source_label: Some(format!("Wikipedia · {project}")),
            created_at,
        }),
        error: None,
    }
}

fn build_empty_response() -> ReaderAssistanceLookupResponse {
    ReaderAssistanceLookupResponse {
        status: ReaderAssistanceLookupStatus::Empty,
        result: None,
        error: None,
    }
}

fn build_offline_response(message: impl Into<String>) -> ReaderAssistanceLookupResponse {
    ReaderAssistanceLookupResponse {
        status: ReaderAssistanceLookupStatus::Offline,
        result: None,
        error: Some(message.into()),
    }
}

fn build_error_response(message: impl Into<String>) -> ReaderAssistanceLookupResponse {
    ReaderAssistanceLookupResponse {
        status: ReaderAssistanceLookupStatus::Error,
        result: None,
        error: Some(message.into()),
    }
}

fn normalize_translation_provider(provider: &str) -> Option<&'static str> {
    TRANSLATION_PROVIDER_NAMES
        .iter()
        .copied()
        .find(|candidate| *candidate == provider.trim())
}

fn translation_provider_settings_path() -> PathBuf {
    if let Ok(path) = std::env::var("BR1_READER_TRANSLATION_PROVIDERS_PATH") {
        return PathBuf::from(path);
    }

    if let Ok(home) = std::env::var("HOME") {
        return PathBuf::from(home)
            .join("Library")
            .join("Application Support")
            .join("br1")
            .join("reader-translation-providers.json");
    }

    std::env::temp_dir()
        .join("br1")
        .join("reader-translation-providers.json")
}

fn default_translation_provider_label(provider: &str, configured: bool) -> String {
    let provider_label = if provider == "deepl" {
        "DeepL"
    } else {
        "Yandex"
    };
    if configured {
        format!("{provider_label} translation is configured in the desktop app.")
    } else {
        format!("{provider_label} API key is not configured yet.")
    }
}

fn translation_provider_key_env_names(provider: &str) -> &'static [&'static str] {
    match provider {
        "deepl" => &["BR1_DEEPL_API_KEY", "DEEPL_API_KEY"],
        "yandex" => &["BR1_YANDEX_TRANSLATE_API_KEY", "YANDEX_TRANSLATE_API_KEY"],
        _ => &[],
    }
}

fn translation_provider_has_local_key(provider: &str) -> bool {
    match provider {
        "yandex" => yandex_translation_config().is_ok(),
        _ => translation_provider_key_env_names(provider)
            .iter()
            .any(|name| {
                std::env::var(name)
                    .map(|value| !value.trim().is_empty())
                    .unwrap_or(false)
            }),
    }
}

fn env_value(names: &[&str]) -> Option<String> {
    names.iter()
        .find_map(|name| std::env::var(name).ok())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn yandex_folder_id() -> Option<String> {
    env_value(&[
        "BR1_YANDEX_TRANSLATE_FOLDER_ID",
        "YANDEX_TRANSLATE_FOLDER_ID",
        "BR1_YANDEX_FOLDER_ID",
        "YANDEX_FOLDER_ID",
    ])
}

fn yandex_iam_token() -> Option<String> {
    env_value(&["BR1_YANDEX_TRANSLATE_IAM_TOKEN", "YANDEX_TRANSLATE_IAM_TOKEN"])
}

fn yandex_translation_config() -> Result<YandexTranslationConfig, String> {
    let auth = if let Some(api_key) = env_value(translation_provider_key_env_names("yandex")) {
        (YandexAuthMode::ApiKey, api_key)
    } else if let Some(iam_token) = yandex_iam_token() {
        (YandexAuthMode::Bearer, iam_token)
    } else {
        return Err(
            "Yandex translation requires a local API key or IAM token in the desktop environment."
                .to_string(),
        );
    };

    let Some(folder_id) = yandex_folder_id() else {
        return Err(
            "Yandex translation requires a local folderId in the desktop environment."
                .to_string(),
        );
    };

    Ok(YandexTranslationConfig {
        auth_mode: auth.0,
        auth_token: auth.1,
        folder_id,
    })
}

fn yandex_provider_label() -> String {
    match yandex_translation_config() {
        Ok(config) => match config.auth_mode {
            YandexAuthMode::ApiKey => {
                "Yandex translation is configured in the desktop app via local API key and folderId."
                    .to_string()
            }
            YandexAuthMode::Bearer => {
                "Yandex translation is configured in the desktop app via local IAM token and folderId."
                    .to_string()
            }
        },
        Err(error) => error,
    }
}

fn build_yandex_translate_url() -> Result<Url, String> {
    Url::parse(YANDEX_TRANSLATE_API_ENDPOINT).map_err(|error| error.to_string())
}

fn build_yandex_translate_request_body(
    text: &str,
    source_language: Option<&str>,
    target_language: &str,
    folder_id: &str,
) -> YandexTranslateRequestBody {
    YandexTranslateRequestBody {
        folder_id: folder_id.to_string(),
        texts: vec![text.to_string()],
        target_language_code: target_language.to_ascii_uppercase(),
        source_language_code: source_language.map(|value| value.to_ascii_uppercase()),
    }
}

fn extract_yandex_error_detail(payload: &str) -> Option<String> {
    serde_json::from_str::<YandexErrorResponse>(payload)
        .ok()
        .and_then(|error| {
            error
                .message
                .or_else(|| {
                    error
                        .details
                        .as_ref()
                        .and_then(|details| details.iter().find_map(|detail| detail.message.clone()))
                })
                .or(error.error)
                .or(error.description)
        })
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn classify_yandex_http_error(
    status: reqwest::StatusCode,
    payload: &str,
) -> ReaderAssistanceLookupResponse {
    let detail = extract_yandex_error_detail(payload);
    let lowered_detail = detail
        .as_deref()
        .map(|value| value.to_ascii_lowercase())
        .unwrap_or_default();
    let message = match status {
        reqwest::StatusCode::UNAUTHORIZED | reqwest::StatusCode::FORBIDDEN => {
            "Yandex translation credentials or folder configuration are invalid.".to_string()
        }
        reqwest::StatusCode::TOO_MANY_REQUESTS => {
            "Yandex translation is rate limited right now.".to_string()
        }
        reqwest::StatusCode::BAD_REQUEST => {
            if lowered_detail.contains("quota") || lowered_detail.contains("limit") {
                "Yandex translation quota has been exceeded.".to_string()
            } else {
                "Yandex translation request is invalid. Check the local language or folder configuration."
                    .to_string()
            }
        }
        _ if lowered_detail.contains("quota") || lowered_detail.contains("limit") => {
            "Yandex translation quota has been exceeded.".to_string()
        }
        _ => format!("Yandex translation failed with HTTP {}", status),
    };

    if let Some(detail) = detail {
        build_error_response(format!("{message} ({detail})"))
    } else {
        build_error_response(message)
    }
}

fn translation_provider_status_from_stored(
    stored: &StoredReaderTranslationProviderSettings,
) -> ReaderTranslationProviderStatus {
    let configured = translation_provider_has_local_key(&stored.provider);
    ReaderTranslationProviderStatus {
        provider: stored.provider.clone(),
        status: if configured {
            ReaderTranslationProviderStatusKind::Configured
        } else {
            ReaderTranslationProviderStatusKind::MissingKey
        },
        configured,
        label: if configured {
            if stored.provider == "yandex" {
                yandex_provider_label()
            } else {
                stored.label.clone()
            }
        } else {
            if stored.provider == "yandex" {
                yandex_provider_label()
            } else {
                default_translation_provider_label(&stored.provider, false)
            }
        },
        updated_at: stored.updated_at,
    }
}

fn default_translation_provider_statuses() -> Vec<ReaderTranslationProviderStatus> {
    TRANSLATION_PROVIDER_NAMES
        .iter()
        .map(|provider| ReaderTranslationProviderStatus {
            provider: (*provider).to_string(),
            status: ReaderTranslationProviderStatusKind::MissingKey,
            configured: false,
            label: default_translation_provider_label(provider, false),
            updated_at: 0,
        })
        .collect()
}

fn default_translation_provider_settings() -> Vec<StoredReaderTranslationProviderSettings> {
    TRANSLATION_PROVIDER_NAMES
        .iter()
        .map(|provider| StoredReaderTranslationProviderSettings {
            provider: (*provider).to_string(),
            configured: false,
            label: default_translation_provider_label(provider, false),
            updated_at: 0,
        })
        .collect()
}

fn read_translation_provider_settings(
    path: &Path,
) -> Result<Vec<StoredReaderTranslationProviderSettings>, String> {
    if !path.exists() {
        return Ok(default_translation_provider_settings());
    }

    let raw = fs::read_to_string(path).map_err(|error| error.to_string())?;
    let stored: Vec<StoredReaderTranslationProviderSettings> =
        serde_json::from_str(&raw).map_err(|error| error.to_string())?;

    Ok(TRANSLATION_PROVIDER_NAMES
        .iter()
        .map(|provider| {
            stored
                .iter()
                .find(|entry| entry.provider == *provider)
                .cloned()
                .unwrap_or_else(|| StoredReaderTranslationProviderSettings {
                    provider: (*provider).to_string(),
                    configured: false,
                    label: default_translation_provider_label(provider, false),
                    updated_at: 0,
                })
        })
        .collect())
}

fn write_translation_provider_settings(
    path: &Path,
    settings: &[StoredReaderTranslationProviderSettings],
) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let raw = serde_json::to_string_pretty(settings).map_err(|error| error.to_string())?;
    fs::write(path, raw).map_err(|error| error.to_string())
}

fn save_translation_provider_setting(
    mut settings: Vec<StoredReaderTranslationProviderSettings>,
    input: ReaderTranslationProviderSettingsInput,
) -> Result<Vec<StoredReaderTranslationProviderSettings>, String> {
    let provider = normalize_translation_provider(&input.provider).ok_or_else(|| {
        format!(
            "Reader translation provider is not implemented: {}",
            input.provider
        )
    })?;
    let updated_at = now_millis().unwrap_or_default();
    let configured = translation_provider_has_local_key(provider);
    let label = input
        .label
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| {
            if provider == "yandex" {
                yandex_provider_label()
            } else {
                default_translation_provider_label(provider, configured)
            }
        });
    let next = StoredReaderTranslationProviderSettings {
        provider: provider.to_string(),
        configured,
        label,
        updated_at,
    };

    if let Some(existing) = settings.iter_mut().find(|entry| entry.provider == provider) {
        *existing = next;
    } else {
        settings.push(next);
    }

    settings.sort_by(|left, right| left.provider.cmp(&right.provider));
    Ok(settings)
}

fn classify_network_error(
    provider_label: &str,
    error: &reqwest::Error,
) -> ReaderAssistanceLookupResponse {
    if error.is_connect() || error.is_timeout() {
        build_offline_response(format!("{provider_label} lookup is unavailable right now."))
    } else {
        build_error_response(error.to_string())
    }
}

fn normalize_lookup_text(value: &str, limit: usize) -> String {
    value
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .chars()
        .take(limit)
        .collect()
}

fn translate_provider_label(provider: &str) -> &'static str {
    if provider == "deepl" {
        "DeepL"
    } else {
        "Yandex"
    }
}

fn deepl_api_key() -> Option<String> {
    translation_provider_key_env_names("deepl")
        .iter()
        .find_map(|name| std::env::var(name).ok())
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn build_deepl_translate_url(api_key: &str) -> Result<Url, String> {
    let base = if api_key.ends_with(":fx") {
        DEEPL_TRANSLATE_API_FREE_ENDPOINT
    } else {
        DEEPL_TRANSLATE_API_ENDPOINT
    };

    Url::parse(base).map_err(|error| error.to_string())
}

fn extract_deepl_error_detail(payload: &str) -> Option<String> {
    serde_json::from_str::<DeepLErrorResponse>(payload)
        .ok()
        .and_then(|error| error.message.or(error.detail))
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
}

fn build_translation_result_title(text: &str) -> String {
    let excerpt = normalize_lookup_text(text, 48);
    if excerpt.is_empty() {
        "Translation".to_string()
    } else {
        format!("翻译：{excerpt}")
    }
}

fn build_translation_response(
    provider: &str,
    source_language: Option<&str>,
    target_language: &str,
    source_text: &str,
    translated_text: &str,
) -> ReaderAssistanceLookupResponse {
    let created_at = now_millis().unwrap_or_default();
    let slug = normalize_lookup_text(source_text, 24).replace(' ', "-");
    let provider_label = translate_provider_label(provider);
    let detected_source = source_language.unwrap_or("AUTO");

    ReaderAssistanceLookupResponse {
        status: ReaderAssistanceLookupStatus::Ready,
        result: Some(ReaderAssistanceLookupResult {
            id: format!("translation:{provider}:{target_language}:{slug}:{created_at}"),
            provider: provider.to_string(),
            title: build_translation_result_title(source_text),
            body: normalize_lookup_text(translated_text, TRANSLATION_RESULT_BODY_LIMIT),
            url: None,
            source_label: Some(format!(
                "{provider_label} · {} -> {}",
                detected_source,
                target_language.to_ascii_uppercase()
            )),
            created_at,
        }),
        error: None,
    }
}

fn classify_deepl_http_error(
    status: reqwest::StatusCode,
    payload: &str,
) -> ReaderAssistanceLookupResponse {
    let detail = extract_deepl_error_detail(payload);
    let message = match status {
        reqwest::StatusCode::UNAUTHORIZED | reqwest::StatusCode::FORBIDDEN => {
            "DeepL API key is invalid or not authorized.".to_string()
        }
        reqwest::StatusCode::TOO_MANY_REQUESTS => {
            "DeepL translation is rate limited right now.".to_string()
        }
        status if status.as_u16() == 456 => {
            "DeepL translation quota has been exceeded.".to_string()
        }
        reqwest::StatusCode::BAD_REQUEST => {
            "DeepL translation request is invalid. Check the language configuration.".to_string()
        }
        _ => format!("DeepL translation failed with HTTP {}", status),
    };

    if let Some(detail) = detail {
        build_error_response(format!("{message} ({detail})"))
    } else {
        build_error_response(message)
    }
}

fn format_dictionary_entry_body(entry: &DictionaryEntryResponse) -> String {
    let mut sections = Vec::new();
    let phonetic = entry
        .phonetic
        .as_deref()
        .filter(|value| !value.trim().is_empty())
        .map(str::to_string)
        .or_else(|| {
            entry
                .phonetics
                .iter()
                .filter_map(|phonetic| phonetic.text.as_deref())
                .find(|value| !value.trim().is_empty())
                .map(ToString::to_string)
        });

    if let Some(phonetic) = phonetic.as_deref() {
        sections.push(format!("音标：{}", normalize_lookup_text(phonetic, 120)));
    }

    if let Some(origin) = entry
        .origin
        .as_deref()
        .filter(|value| !value.trim().is_empty())
    {
        sections.push(format!("词源：{}", normalize_lookup_text(origin, 240)));
    }

    for meaning in entry.meanings.iter().take(4) {
        let part_of_speech = meaning
            .part_of_speech
            .as_deref()
            .filter(|value| !value.trim().is_empty())
            .unwrap_or("词性");
        let definitions = meaning
            .definitions
            .iter()
            .take(2)
            .map(|definition| {
                let mut line = normalize_lookup_text(&definition.definition, 240);
                if let Some(example) = definition
                    .example
                    .as_deref()
                    .filter(|value| !value.trim().is_empty())
                {
                    line.push_str("（");
                    line.push_str(&normalize_lookup_text(example, 120));
                    line.push('）');
                }
                line
            })
            .filter(|definition| !definition.trim().is_empty())
            .collect::<Vec<_>>();

        if !definitions.is_empty() {
            sections.push(format!("{}：{}", part_of_speech, definitions.join("；")));
        }
    }

    let body = sections.join(" ");
    normalize_lookup_text(&body, DICTIONARY_LOOKUP_BODY_LIMIT)
}

fn build_dictionary_lookup_response(
    language: &str,
    normalized_term: &str,
    entry: &DictionaryEntryResponse,
) -> ReaderAssistanceLookupResponse {
    let created_at = now_millis().unwrap_or_default();
    ReaderAssistanceLookupResponse {
        status: ReaderAssistanceLookupStatus::Ready,
        result: Some(ReaderAssistanceLookupResult {
            id: format!("dictionary:{language}:{normalized_term}:{created_at}"),
            provider: "dictionary".to_string(),
            title: entry.word.trim().to_string(),
            body: format_dictionary_entry_body(entry),
            url: None,
            source_label: Some(format!("Dictionary · {language}")),
            created_at,
        }),
        error: None,
    }
}

async fn fetch_wikipedia_opensearch(
    client: &reqwest::Client,
    project: &str,
    term: &str,
) -> ReaderAssistanceLookupResponse {
    let url = match build_wikipedia_api_url(
        project,
        &[
            ("action", "opensearch"),
            ("search", term),
            ("limit", "5"),
            ("namespace", "0"),
            ("format", "json"),
            ("redirects", "resolve"),
        ],
    ) {
        Ok(url) => url,
        Err(error) => return build_error_response(error),
    };

    let response = match client.get(url).send().await {
        Ok(response) => response,
        Err(error) => return classify_network_error("Wikipedia", &error),
    };

    if !response.status().is_success() {
        return build_error_response(format!(
            "Wikipedia search failed with HTTP {}",
            response.status()
        ));
    }

    let WikipediaOpenSearchResponse(_, titles, descriptions, urls) = match response.json().await {
        Ok(payload) => payload,
        Err(error) => return build_error_response(error.to_string()),
    };

    let Some(first_title) = titles.first() else {
        return build_empty_response();
    };

    let fallback_body = descriptions.first().map(String::as_str).unwrap_or("");
    let fallback_url = urls.first().cloned();
    fetch_wikipedia_extract(
        client,
        project,
        first_title,
        term,
        fallback_body,
        fallback_url,
    )
    .await
}

async fn fetch_wikipedia_extract(
    client: &reqwest::Client,
    project: &str,
    title: &str,
    normalized_term: &str,
    fallback_body: &str,
    fallback_url: Option<String>,
) -> ReaderAssistanceLookupResponse {
    let url = match build_wikipedia_api_url(
        project,
        &[
            ("action", "query"),
            ("prop", "extracts|info"),
            ("exintro", "1"),
            ("explaintext", "1"),
            ("inprop", "url"),
            ("redirects", "1"),
            ("titles", title),
            ("format", "json"),
        ],
    ) {
        Ok(url) => url,
        Err(error) => return build_error_response(error),
    };

    let response = match client.get(url).send().await {
        Ok(response) => response,
        Err(error) => return classify_network_error("Wikipedia", &error),
    };

    if !response.status().is_success() {
        return build_error_response(format!(
            "Wikipedia lookup failed with HTTP {}",
            response.status()
        ));
    }

    let payload: WikipediaQueryResponse = match response.json().await {
        Ok(payload) => payload,
        Err(error) => return build_error_response(error.to_string()),
    };

    let page = payload.query.pages.values().next();
    let page_title = page
        .and_then(|value| value.title.as_ref())
        .cloned()
        .unwrap_or_else(|| title.to_string());
    let body = page
        .and_then(|value| value.extract.as_ref())
        .cloned()
        .filter(|value| !value.trim().is_empty())
        .unwrap_or_else(|| fallback_body.to_string());

    let page_url = page
        .and_then(|value| value.fullurl.as_ref())
        .cloned()
        .or_else(|| build_wikipedia_article_url(project, &page_title))
        .or(fallback_url);

    if body.trim().is_empty() {
        return build_empty_response();
    }

    build_lookup_response(project, normalized_term, &page_title, &body, page_url)
}

async fn fetch_dictionary_entry(
    client: &reqwest::Client,
    language: &str,
    term: &str,
) -> ReaderAssistanceLookupResponse {
    let url = match build_dictionary_api_url(language, term) {
        Ok(url) => url,
        Err(error) => return build_error_response(error),
    };

    let response = match client.get(url).send().await {
        Ok(response) => response,
        Err(error) => return classify_network_error("Dictionary", &error),
    };

    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return build_empty_response();
    }

    if !response.status().is_success() {
        return build_error_response(format!(
            "Dictionary lookup failed with HTTP {}",
            response.status()
        ));
    }

    let payload: Vec<DictionaryEntryResponse> = match response.json().await {
        Ok(payload) => payload,
        Err(error) => return build_error_response(error.to_string()),
    };

    let Some(entry) = payload.first() else {
        return build_empty_response();
    };

    if entry.word.trim().is_empty() || format_dictionary_entry_body(entry).trim().is_empty() {
        return build_empty_response();
    }

    build_dictionary_lookup_response(language, term, entry)
}

async fn fetch_deepl_translation(
    client: &reqwest::Client,
    text: &str,
    source_language: Option<&str>,
    target_language: &str,
) -> ReaderAssistanceLookupResponse {
    let Some(api_key) = deepl_api_key() else {
        return build_error_response("DeepL translation has no API key configured yet.");
    };

    let url = match build_deepl_translate_url(&api_key) {
        Ok(url) => url,
        Err(error) => return build_error_response(error),
    };

    let mut params = vec![
        ("text".to_string(), text.to_string()),
        (
            "target_lang".to_string(),
            target_language.to_ascii_uppercase(),
        ),
    ];
    if let Some(source_language) = source_language {
        params.push((
            "source_lang".to_string(),
            source_language.to_ascii_uppercase(),
        ));
    }

    let response = match client
        .post(url)
        .header("Authorization", format!("DeepL-Auth-Key {api_key}"))
        .form(&params)
        .send()
        .await
    {
        Ok(response) => response,
        Err(error) => {
            if error.is_connect() || error.is_timeout() {
                return build_offline_response("DeepL translation is unavailable right now.");
            }

            return build_error_response(error.to_string());
        }
    };

    if !response.status().is_success() {
        let status = response.status();
        let payload = response.text().await.unwrap_or_default();
        return classify_deepl_http_error(status, &payload);
    }

    let payload: DeepLTranslationResponse = match response.json().await {
        Ok(payload) => payload,
        Err(error) => return build_error_response(error.to_string()),
    };

    let Some(translation) = payload.translations.first() else {
        return build_empty_response();
    };

    let translated_text = normalize_lookup_text(&translation.text, TRANSLATION_RESULT_BODY_LIMIT);
    if translated_text.is_empty() {
        return build_empty_response();
    }

    build_translation_response(
        "deepl",
        translation
            .detected_source_language
            .as_deref()
            .or(source_language),
        target_language,
        text,
        &translated_text,
    )
}

async fn fetch_yandex_translation(
    client: &reqwest::Client,
    text: &str,
    source_language: Option<&str>,
    target_language: &str,
) -> ReaderAssistanceLookupResponse {
    let config = match yandex_translation_config() {
        Ok(config) => config,
        Err(error) => return build_error_response(error),
    };

    let url = match build_yandex_translate_url() {
        Ok(url) => url,
        Err(error) => return build_error_response(error),
    };

    let body = build_yandex_translate_request_body(
        text,
        source_language,
        target_language,
        &config.folder_id,
    );
    let auth_header = match config.auth_mode {
        YandexAuthMode::ApiKey => format!("Api-Key {}", config.auth_token),
        YandexAuthMode::Bearer => format!("Bearer {}", config.auth_token),
    };

    let response = match client
        .post(url)
        .header("Authorization", auth_header)
        .json(&body)
        .send()
        .await
    {
        Ok(response) => response,
        Err(error) => {
            if error.is_connect() || error.is_timeout() {
                return build_offline_response("Yandex translation is unavailable right now.");
            }

            return build_error_response(error.to_string());
        }
    };

    if !response.status().is_success() {
        let status = response.status();
        let payload = response.text().await.unwrap_or_default();
        return classify_yandex_http_error(status, &payload);
    }

    let payload: YandexTranslationResponse = match response.json().await {
        Ok(payload) => payload,
        Err(error) => return build_error_response(error.to_string()),
    };

    let Some(translation) = payload.translations.first() else {
        return build_empty_response();
    };

    let translated_text = normalize_lookup_text(&translation.text, TRANSLATION_RESULT_BODY_LIMIT);
    if translated_text.is_empty() {
        return build_empty_response();
    }

    build_translation_response(
        "yandex",
        translation
            .detected_language_code
            .as_deref()
            .or(source_language),
        target_language,
        text,
        &translated_text,
    )
}

#[tauri::command]
pub(crate) async fn lookup_reader_assistance(
    request: ReaderAssistanceLookupRequest,
) -> ReaderAssistanceLookupResponse {
    let normalized_term = normalize_lookup_term(&request.term);
    if normalized_term.is_empty() {
        return build_empty_response();
    }

    let client = match reqwest::Client::builder()
        .timeout(WIKIPEDIA_LOOKUP_TIMEOUT)
        .user_agent("br1-readest-alignment-exec/1.0")
        .build()
    {
        Ok(client) => client,
        Err(error) => return build_error_response(error.to_string()),
    };

    match request.provider.as_str() {
        "wikipedia" => {
            let project = normalize_wikipedia_project(request.language.as_deref());
            fetch_wikipedia_opensearch(&client, &project, &normalized_term).await
        }
        "dictionary" => {
            let language = normalize_dictionary_language(request.language.as_deref());
            fetch_dictionary_entry(&client, &language, &normalized_term).await
        }
        provider => build_error_response(format!(
            "Reader assistance provider is not implemented: {}",
            provider
        )),
    }
}

#[tauri::command]
pub(crate) async fn translate_reader_assistance(
    request: ReaderAssistanceTranslationRequest,
) -> ReaderAssistanceLookupResponse {
    let provider = match normalize_translation_provider(&request.provider) {
        Some(provider) => provider,
        None => {
            return build_error_response(format!(
                "Reader translation provider is not implemented: {}",
                request.provider
            ))
        }
    };
    let text = normalize_translation_text(&request.text);
    if text.is_empty() {
        return build_empty_response();
    }

    let target_language = normalize_translation_language(Some(&request.target_language))
        .unwrap_or_else(|| "ZH".to_string());
    let source_language = normalize_translation_language(request.source_language.as_deref());
    let client = match reqwest::Client::builder()
        .timeout(TRANSLATION_TIMEOUT)
        .user_agent("br1-readest-alignment-exec/1.0")
        .build()
    {
        Ok(client) => client,
        Err(error) => return build_error_response(error.to_string()),
    };

    match provider {
        "deepl" => {
            fetch_deepl_translation(&client, &text, source_language.as_deref(), &target_language)
                .await
        }
        "yandex" => {
            fetch_yandex_translation(&client, &text, source_language.as_deref(), &target_language)
                .await
        }
        other => build_error_response(format!(
            "{} translation bridge is not implemented yet.",
            translate_provider_label(other)
        )),
    }
}

#[tauri::command]
pub(crate) async fn get_reader_translation_provider_statuses(
) -> Vec<ReaderTranslationProviderStatus> {
    let path = translation_provider_settings_path();
    match read_translation_provider_settings(&path) {
        Ok(settings) => settings
            .into_iter()
            .map(|setting| translation_provider_status_from_stored(&setting))
            .collect(),
        Err(_) => default_translation_provider_statuses(),
    }
}

#[tauri::command]
pub(crate) async fn save_reader_translation_provider_settings(
    input: ReaderTranslationProviderSettingsInput,
) -> Result<ReaderTranslationProviderStatus, String> {
    let path = translation_provider_settings_path();
    let provider = normalize_translation_provider(&input.provider).ok_or_else(|| {
        format!(
            "Reader translation provider is not implemented: {}",
            input.provider
        )
    })?;
    let settings = read_translation_provider_settings(&path)?;
    let updated = save_translation_provider_setting(settings, input)?;
    write_translation_provider_settings(&path, &updated)?;

    let status = updated
        .into_iter()
        .find(|setting| setting.provider == provider)
        .map(|setting| translation_provider_status_from_stored(&setting))
        .unwrap_or_else(|| ReaderTranslationProviderStatus {
            provider: provider.to_string(),
            status: ReaderTranslationProviderStatusKind::MissingKey,
            configured: false,
            label: default_translation_provider_label(provider, false),
            updated_at: 0,
        });

    Ok(status)
}

#[cfg(test)]
mod tests {
    use super::{
        build_deepl_translate_url, build_yandex_translate_request_body, build_yandex_translate_url,
        classify_deepl_http_error, classify_yandex_http_error,
        default_translation_provider_settings, default_translation_provider_statuses,
        format_dictionary_entry_body, normalize_dictionary_language, normalize_lookup_term,
        normalize_translation_language, normalize_translation_text, normalize_wikipedia_project,
        read_translation_provider_settings, save_translation_provider_setting,
        translation_provider_status_from_stored, write_translation_provider_settings,
        DictionaryDefinition, DictionaryEntryResponse, DictionaryMeaning, DictionaryPhonetic,
        ReaderAssistanceLookupStatus, ReaderTranslationProviderSettingsInput, YANDEX_TRANSLATE_API_ENDPOINT,
        ReaderTranslationProviderStatusKind, DEEPL_TRANSLATE_API_ENDPOINT,
        DEEPL_TRANSLATE_API_FREE_ENDPOINT, TRANSLATION_TEXT_LIMIT, YandexTranslateRequestBody,
    };
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_translation_provider_settings_path(name: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("br1-{name}-{nonce}.json"))
    }

    #[test]
    fn normalizes_wikipedia_project_from_language_tag() {
        assert_eq!(normalize_wikipedia_project(Some("en-US")), "en");
        assert_eq!(normalize_wikipedia_project(Some("zh-CN")), "zh");
        assert_eq!(normalize_wikipedia_project(Some("de")), "de");
        assert_eq!(normalize_wikipedia_project(Some("xx-YY")), "en");
    }

    #[test]
    fn trims_and_limits_lookup_term() {
        let normalized = normalize_lookup_term("  alpha   beta   gamma  ");
        assert_eq!(normalized, "alpha beta gamma");

        let long_term = "x".repeat(200);
        assert_eq!(normalize_lookup_term(&long_term).chars().count(), 120);
    }

    #[test]
    fn trims_and_limits_translation_text() {
        let normalized = normalize_translation_text("  alpha \n\n beta   gamma  ");
        assert_eq!(normalized, "alpha beta gamma");

        let long_text = "x".repeat(TRANSLATION_TEXT_LIMIT + 200);
        assert_eq!(
            normalize_translation_text(&long_text).chars().count(),
            TRANSLATION_TEXT_LIMIT
        );
    }

    #[test]
    fn normalizes_translation_languages_for_deepl() {
        assert_eq!(
            normalize_translation_language(Some(" zh-cn ")).as_deref(),
            Some("ZH-CN")
        );
        assert_eq!(
            normalize_translation_language(Some("en_us")).as_deref(),
            Some("EN-US")
        );
        assert_eq!(normalize_translation_language(Some("   ")), None);
        assert_eq!(normalize_translation_language(None), None);
    }

    #[test]
    fn normalizes_dictionary_language_to_english() {
        assert_eq!(normalize_dictionary_language(Some("en")), "en");
        assert_eq!(normalize_dictionary_language(Some("en-US")), "en");
        assert_eq!(normalize_dictionary_language(Some("de")), "en");
        assert_eq!(normalize_dictionary_language(None), "en");
    }

    #[test]
    fn formats_dictionary_entry_body_from_entry_data() {
        let entry = DictionaryEntryResponse {
            word: "hello".to_string(),
            phonetic: Some("həˈləʊ".to_string()),
            phonetics: vec![DictionaryPhonetic {
                text: Some("həˈləʊ".to_string()),
            }],
            origin: Some("early 19th century".to_string()),
            meanings: vec![DictionaryMeaning {
                part_of_speech: Some("exclamation".to_string()),
                definitions: vec![DictionaryDefinition {
                    definition: "used as a greeting".to_string(),
                    example: Some("hello there".to_string()),
                }],
            }],
        };

        let body = format_dictionary_entry_body(&entry);
        assert!(body.contains("音标"));
        assert!(body.contains("词源"));
        assert!(body.contains("exclamation"));
        assert!(body.contains("used as a greeting"));
    }

    #[test]
    fn defaults_translation_provider_statuses_to_missing_keys() {
        let statuses = default_translation_provider_statuses();

        assert_eq!(statuses.len(), 2);
        assert!(statuses.iter().all(|status| matches!(
            status.status,
            ReaderTranslationProviderStatusKind::MissingKey
        )));
        assert!(statuses.iter().all(|status| !status.configured));
    }

    #[test]
    fn picks_free_deepl_endpoint_for_free_keys() {
        let free = build_deepl_translate_url("demo-key:fx").unwrap();
        let paid = build_deepl_translate_url("demo-key").unwrap();

        assert_eq!(free.as_str(), DEEPL_TRANSLATE_API_FREE_ENDPOINT);
        assert_eq!(paid.as_str(), DEEPL_TRANSLATE_API_ENDPOINT);
    }

    #[test]
    fn classifies_deepl_quota_and_auth_failures_without_network() {
        let quota = classify_deepl_http_error(
            reqwest::StatusCode::from_u16(456).unwrap(),
            r#"{"message":"Quota exceeded"}"#,
        );
        assert!(matches!(quota.status, ReaderAssistanceLookupStatus::Error));
        assert_eq!(
            quota.error.as_deref(),
            Some("DeepL translation quota has been exceeded. (Quota exceeded)")
        );

        let auth = classify_deepl_http_error(
            reqwest::StatusCode::UNAUTHORIZED,
            r#"{"message":"Authorization failed"}"#,
        );
        assert!(matches!(auth.status, ReaderAssistanceLookupStatus::Error));
        assert_eq!(
            auth.error.as_deref(),
            Some("DeepL API key is invalid or not authorized. (Authorization failed)")
        );
    }

    #[test]
    fn builds_yandex_request_body_and_endpoint_without_renderer_input() {
        let url = build_yandex_translate_url().unwrap();
        assert_eq!(url.as_str(), YANDEX_TRANSLATE_API_ENDPOINT);

        let body = build_yandex_translate_request_body("Hello world", Some("en"), "zh", "folder-123");
        assert_eq!(
            body,
            YandexTranslateRequestBody {
                folder_id: "folder-123".to_string(),
                texts: vec!["Hello world".to_string()],
                target_language_code: "ZH".to_string(),
                source_language_code: Some("EN".to_string()),
            }
        );
    }

    #[test]
    fn classifies_yandex_rate_quota_and_auth_failures_without_network() {
        let rate = classify_yandex_http_error(
            reqwest::StatusCode::TOO_MANY_REQUESTS,
            r#"{"message":"Too many requests"}"#,
        );
        assert!(matches!(rate.status, ReaderAssistanceLookupStatus::Error));
        assert_eq!(
            rate.error.as_deref(),
            Some("Yandex translation is rate limited right now. (Too many requests)")
        );

        let quota = classify_yandex_http_error(
            reqwest::StatusCode::BAD_REQUEST,
            r#"{"message":"Quota exceeded for folder"}"#,
        );
        assert!(matches!(quota.status, ReaderAssistanceLookupStatus::Error));
        assert_eq!(
            quota.error.as_deref(),
            Some("Yandex translation quota has been exceeded. (Quota exceeded for folder)")
        );

        let auth = classify_yandex_http_error(
            reqwest::StatusCode::FORBIDDEN,
            r#"{"message":"Permission denied"}"#,
        );
        assert!(matches!(auth.status, ReaderAssistanceLookupStatus::Error));
        assert_eq!(
            auth.error.as_deref(),
            Some("Yandex translation credentials or folder configuration are invalid. (Permission denied)")
        );
    }

    #[test]
    fn persists_translation_provider_metadata_without_trusting_renderer_configured_state() {
        let path = temp_translation_provider_settings_path("reader-translation-settings");
        let settings = save_translation_provider_setting(
            default_translation_provider_settings(),
            ReaderTranslationProviderSettingsInput {
                provider: "deepl".to_string(),
                label: Some("  DeepL translation metadata saved locally  ".to_string()),
            },
        )
        .unwrap();
        write_translation_provider_settings(&path, &settings).unwrap();

        let loaded = read_translation_provider_settings(&path).unwrap();
        let deepl = loaded
            .iter()
            .find(|entry| entry.provider == "deepl")
            .expect("deepl settings");
        let status = translation_provider_status_from_stored(deepl);

        assert_eq!(loaded.len(), 2);
        assert!(loaded.iter().any(|entry| entry.provider == "yandex"));
        assert!(matches!(
            status.status,
            ReaderTranslationProviderStatusKind::MissingKey
        ));
        assert!(!status.configured);
        assert_eq!(status.label, "DeepL API key is not configured yet.");
        assert!(!serde_json::to_string(&loaded).unwrap().contains("secret"));
        let _ = fs::remove_file(path);
    }
}
