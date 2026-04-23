use crate::util::now_millis;
use reqwest::Url;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::Duration;

const WIKIPEDIA_PROJECT_ALLOWLIST: &[&str] = &[
    "ar", "cs", "de", "en", "es", "fa", "fi", "fr", "he", "hu", "id", "it", "ja", "ko", "nl",
    "no", "pl", "pt", "ru", "sv", "tr", "uk", "vi", "zh",
];
const WIKIPEDIA_LOOKUP_TERM_LIMIT: usize = 120;
const WIKIPEDIA_LOOKUP_BODY_LIMIT: usize = 1500;
const WIKIPEDIA_LOOKUP_TIMEOUT: Duration = Duration::from_secs(8);
const DICTIONARY_LOOKUP_BODY_LIMIT: usize = 1500;

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
struct WikipediaOpenSearchResponse(
    String,
    Vec<String>,
    Vec<String>,
    Vec<String>,
);

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

fn build_wikipedia_api_url(
    project: &str,
    query: &[(&str, &str)],
) -> Result<Url, String> {
    let base = format!("https://{project}.wikipedia.org/w/api.php");
    Url::parse_with_params(&base, query).map_err(|error| error.to_string())
}

fn build_dictionary_api_url(language: &str, term: &str) -> Result<Url, String> {
    let mut url = Url::parse(&format!(
        "https://api.dictionaryapi.dev/api/v2/entries/{language}/"
    ))
    .map_err(|error| error.to_string())?;
    {
        let mut segments = url.path_segments_mut().map_err(|_| "invalid dictionary endpoint".to_string())?;
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

fn classify_network_error(provider_label: &str, error: &reqwest::Error) -> ReaderAssistanceLookupResponse {
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

    if let Some(origin) = entry.origin.as_deref().filter(|value| !value.trim().is_empty()) {
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
                if let Some(example) = definition.example.as_deref().filter(|value| !value.trim().is_empty()) {
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
    fetch_wikipedia_extract(client, project, first_title, term, fallback_body, fallback_url).await
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

#[cfg(test)]
mod tests {
    use super::{
        format_dictionary_entry_body, normalize_dictionary_language, normalize_lookup_term,
        normalize_wikipedia_project, DictionaryDefinition, DictionaryEntryResponse,
        DictionaryMeaning, DictionaryPhonetic,
    };

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
}
