#![allow(dead_code)]

use crate::commands::library::{import_library_books, register_trusted_library_import_path};
use crate::models::LibraryBookRecord;
use crate::util::{now_millis, reader_storage_component_key, sanitize_filename};
use quick_xml::events::BytesStart;
use quick_xml::events::Event;
use quick_xml::name::QName;
use quick_xml::Reader;
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

const OPDS_FIXTURE_ROOT: &str = include_str!("../../tests/fixtures/catalogs/opds-root.xml");
const OPDS_FIXTURE_NEXT: &str = include_str!("../../tests/fixtures/catalogs/opds-next.xml");
const CALIBRE_FIXTURE_ROOT: &str = include_str!("../../tests/fixtures/catalogs/calibre-root.xml");
const SAMPLE_FIXTURE_EPUB: &[u8] = include_bytes!("../../../static/samples/sample-book.epub");
const SAMPLE_FIXTURE_PDF: &[u8] = include_bytes!("../../../static/samples/sample-outline.pdf");

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CatalogSourceAuthState {
    pub kind: CatalogSourceAuthKind,
    pub label: String,
    pub configured: bool,
    pub required: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CatalogSource {
    pub id: String,
    pub kind: CatalogConnectorKind,
    pub title: String,
    pub base_url: String,
    pub description: Option<String>,
    pub auth: CatalogSourceAuthState,
    pub connectivity: CatalogSourceConnectivityState,
    pub tags: Vec<String>,
    pub created_at: u64,
    pub updated_at: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CatalogSourceConnectivityState {
    pub status: CatalogSourceConnectivityStatus,
    pub label: String,
    pub checked_at: Option<u64>,
    pub retryable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CatalogEntryAuthor {
    pub name: String,
    pub uri: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CatalogEntryLink {
    pub rel: CatalogEntryLinkRel,
    pub href: String,
    pub title: Option<String>,
    pub media_type: Option<String>,
    pub length: Option<u64>,
    pub supports_import: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CatalogEntry {
    pub id: String,
    pub source_id: String,
    pub title: String,
    pub subtitle: Option<String>,
    pub summary: Option<String>,
    pub authors: Vec<CatalogEntryAuthor>,
    pub language: Option<String>,
    pub published_at: Option<String>,
    pub updated_at: Option<String>,
    pub categories: Vec<String>,
    pub links: Vec<CatalogEntryLink>,
    pub availability: CatalogEntryAvailability,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CatalogPagination {
    pub page_id: String,
    pub title: Option<String>,
    pub self_href: Option<String>,
    pub next_href: Option<String>,
    pub previous_href: Option<String>,
    pub total_results: Option<u64>,
    pub items_per_page: Option<u64>,
    pub start_index: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CatalogSearchTemplate {
    pub href: String,
    pub media_type: Option<String>,
    pub query_parameter: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CatalogSearchRequest {
    pub source_id: String,
    pub query: String,
    pub page_href: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CatalogBrowseRequest {
    pub source_id: String,
    pub page_href: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CatalogImportIntentRequest {
    pub source_id: String,
    pub entry_id: String,
    pub page_href: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CatalogSourceSettingsInput {
    pub id: Option<String>,
    pub kind: CatalogConnectorKind,
    pub title: String,
    pub base_url: String,
    pub description: Option<String>,
    pub auth_kind: CatalogSourceAuthKind,
    pub auth_label: Option<String>,
    pub auth_configured: bool,
    pub auth_required: bool,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CatalogSourceSettingsResult {
    pub source: Option<CatalogSource>,
    pub error: Option<CatalogErrorState>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CatalogAuthChallenge {
    pub source_id: String,
    pub kind: CatalogCredentialKind,
    pub realm: Option<String>,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CatalogErrorState {
    pub code: CatalogErrorCode,
    pub message: String,
    pub source_id: Option<String>,
    pub retryable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CatalogPage {
    pub source: CatalogSource,
    pub entries: Vec<CatalogEntry>,
    pub pagination: CatalogPagination,
    pub search: Option<CatalogSearchTemplate>,
    pub auth_challenge: Option<CatalogAuthChallenge>,
    pub error: Option<CatalogErrorState>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CatalogImportIntent {
    pub id: String,
    pub source_id: String,
    pub entry_id: String,
    pub title: String,
    pub acquisition_href: String,
    pub media_type: Option<String>,
    pub file_name_hint: Option<String>,
    pub status: CatalogImportIntentStatus,
    pub blocked_reason: Option<String>,
    pub created_at: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CatalogConnectorStatus {
    pub status: CatalogConnectorStatusKind,
    pub capabilities: Vec<CatalogConnectorKind>,
    pub message: String,
    pub supports_search: bool,
    pub supports_authentication: bool,
    pub supports_import_intent: bool,
    pub error: Option<CatalogErrorState>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) enum CatalogConnectorKind {
    Opds,
    CalibreOpds,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) enum CatalogSourceAuthKind {
    None,
    Basic,
    Bearer,
    Cookie,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) enum CatalogSourceConnectivityStatus {
    Available,
    Offline,
    AuthRequired,
    Unsupported,
    Invalid,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum CatalogCredentialKind {
    Basic,
    Bearer,
    Cookie,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) enum CatalogEntryLinkRel {
    #[serde(rename = "self")]
    SelfLink,
    Start,
    Next,
    Previous,
    Search,
    Acquisition,
    Image,
    Thumbnail,
    Alternate,
    Related,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) enum CatalogEntryAvailability {
    Unknown,
    Available,
    Borrowed,
    Reserved,
    Unavailable,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) enum CatalogErrorCode {
    Unavailable,
    Offline,
    AuthRequired,
    Unsupported,
    InvalidSource,
    InvalidFeed,
    Network,
    Unknown,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredCatalogSource {
    id: String,
    kind: CatalogConnectorKind,
    title: String,
    base_url: String,
    description: Option<String>,
    auth: CatalogSourceAuthState,
    tags: Vec<String>,
    created_at: u64,
    updated_at: u64,
}

#[derive(Debug, Clone)]
enum ResolvedCatalogSource {
    Fixture(CatalogSourceDefinition),
    User(StoredCatalogSource),
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub(crate) enum CatalogImportIntentStatus {
    Ready,
    Blocked,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum CatalogConnectorStatusKind {
    Available,
    Unavailable,
    Offline,
    Error,
}

#[derive(Debug, Clone)]
struct CatalogSourceDefinition {
    id: &'static str,
    kind: CatalogConnectorKind,
    title: &'static str,
    base_url: &'static str,
    description: &'static str,
    tags: &'static [&'static str],
    root_href: &'static str,
    pages: &'static [CatalogFixturePage],
}

#[derive(Debug, Clone)]
struct CatalogFixturePage {
    href: &'static str,
    xml: &'static str,
}

#[derive(Default)]
struct FeedBuilder {
    title: Option<String>,
    updated: Option<String>,
    links: Vec<CatalogEntryLink>,
    entries: Vec<CatalogEntry>,
}

#[derive(Default)]
struct EntryBuilder {
    id: Option<String>,
    title: Option<String>,
    subtitle: Option<String>,
    summary: Option<String>,
    authors: Vec<CatalogEntryAuthor>,
    language: Option<String>,
    published_at: Option<String>,
    updated_at: Option<String>,
    categories: Vec<String>,
    links: Vec<CatalogEntryLink>,
}

#[derive(Default)]
struct AuthorBuilder {
    name: Option<String>,
    uri: Option<String>,
}

#[derive(Copy, Clone)]
enum TextTarget {
    FeedTitle,
    FeedUpdated,
    EntryId,
    EntryTitle,
    EntrySubtitle,
    EntrySummary,
    EntryLanguage,
    EntryPublished,
    EntryUpdated,
    AuthorName,
    AuthorUri,
}

static OPDS_PAGES: &[CatalogFixturePage] = &[
    CatalogFixturePage {
        href: "fixture://opds/root.xml",
        xml: OPDS_FIXTURE_ROOT,
    },
    CatalogFixturePage {
        href: "fixture://opds/next.xml",
        xml: OPDS_FIXTURE_NEXT,
    },
];

static CALIBRE_PAGES: &[CatalogFixturePage] = &[CatalogFixturePage {
    href: "fixture://calibre/root.xml",
    xml: CALIBRE_FIXTURE_ROOT,
}];

fn catalog_sources() -> Vec<CatalogSourceDefinition> {
    vec![
        CatalogSourceDefinition {
            id: "fixture-opds",
            kind: CatalogConnectorKind::Opds,
            title: "Readest OPDS fixture",
            base_url: "fixture://opds/root.xml",
            description: "Bundled OPDS fixture for safe catalog browsing.",
            tags: &["fixture", "opds"],
            root_href: "fixture://opds/root.xml",
            pages: OPDS_PAGES,
        },
        CatalogSourceDefinition {
            id: "fixture-calibre",
            kind: CatalogConnectorKind::CalibreOpds,
            title: "Calibre OPDS fixture",
            base_url: "fixture://calibre/root.xml",
            description: "Bundled Calibre-compatible OPDS fixture.",
            tags: &["fixture", "calibre", "opds"],
            root_href: "fixture://calibre/root.xml",
            pages: CALIBRE_PAGES,
        },
    ]
}

fn source_from_definition(definition: &CatalogSourceDefinition) -> CatalogSource {
    CatalogSource {
        id: definition.id.to_string(),
        kind: definition.kind.clone(),
        title: definition.title.to_string(),
        base_url: definition.base_url.to_string(),
        description: Some(definition.description.to_string()),
        auth: CatalogSourceAuthState {
            kind: CatalogSourceAuthKind::None,
            label: "No authentication required for bundled fixture".to_string(),
            configured: true,
            required: false,
        },
        connectivity: CatalogSourceConnectivityState {
            status: CatalogSourceConnectivityStatus::Available,
            label: "Bundled fixture is available offline.".to_string(),
            checked_at: None,
            retryable: false,
        },
        tags: definition.tags.iter().map(|tag| tag.to_string()).collect(),
        created_at: 0,
        updated_at: 0,
    }
}

fn find_fixture_source(source_id: &str) -> Option<CatalogSourceDefinition> {
    catalog_sources()
        .into_iter()
        .find(|source| source.id == source_id.trim())
}

fn find_source(source_id: &str) -> Result<Option<ResolvedCatalogSource>, CatalogErrorState> {
    if let Some(source) = find_fixture_source(source_id) {
        return Ok(Some(ResolvedCatalogSource::Fixture(source)));
    }
    Ok(read_user_catalog_sources(&catalog_sources_path())?
        .into_iter()
        .find(|source| source.id == source_id.trim())
        .map(ResolvedCatalogSource::User))
}

fn find_page<'a>(
    definition: &'a CatalogSourceDefinition,
    page_href: Option<&str>,
) -> Option<&'a CatalogFixturePage> {
    let href = page_href
        .map(|value| value.trim())
        .filter(|value| !value.is_empty())
        .unwrap_or(definition.root_href);
    definition.pages.iter().find(|page| page.href == href)
}

fn catalog_sources_path() -> PathBuf {
    if let Ok(path) = std::env::var("BR1_CATALOG_SOURCES_PATH") {
        return PathBuf::from(path);
    }

    if let Ok(home) = std::env::var("HOME") {
        return PathBuf::from(home)
            .join("Library")
            .join("Application Support")
            .join("br1")
            .join("catalog-sources.json");
    }

    std::env::temp_dir()
        .join("br1")
        .join("catalog-sources.json")
}

fn read_user_catalog_sources(path: &Path) -> Result<Vec<StoredCatalogSource>, CatalogErrorState> {
    if !path.exists() {
        return Ok(Vec::new());
    }

    let raw = fs::read_to_string(path).map_err(|error| {
        error_state(
            CatalogErrorCode::Offline,
            format!("Could not read catalog source settings: {error}"),
            None,
            true,
        )
    })?;
    serde_json::from_str(&raw).map_err(|error| {
        error_state(
            CatalogErrorCode::InvalidSource,
            format!("Catalog source settings are not valid JSON: {error}"),
            None,
            false,
        )
    })
}

fn write_user_catalog_sources(
    path: &Path,
    sources: &[StoredCatalogSource],
) -> Result<(), CatalogErrorState> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| {
            error_state(
                CatalogErrorCode::Offline,
                format!("Could not create catalog source settings directory: {error}"),
                None,
                true,
            )
        })?;
    }
    let raw = serde_json::to_string_pretty(sources).map_err(|error| {
        error_state(
            CatalogErrorCode::Unknown,
            format!("Could not serialize catalog source settings: {error}"),
            None,
            false,
        )
    })?;
    fs::write(path, raw).map_err(|error| {
        error_state(
            CatalogErrorCode::Offline,
            format!("Could not persist catalog source settings: {error}"),
            None,
            true,
        )
    })
}

fn normalize_source_id(id: Option<&str>, title: &str) -> String {
    let seed = id
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(title);
    let mut normalized = String::new();
    let mut previous_dash = false;
    for character in seed.chars().flat_map(char::to_lowercase) {
        if character.is_ascii_alphanumeric() {
            normalized.push(character);
            previous_dash = false;
        } else if !previous_dash {
            normalized.push('-');
            previous_dash = true;
        }
    }
    let normalized = normalized.trim_matches('-');
    if normalized.is_empty() {
        "user-catalog".to_string()
    } else if normalized.starts_with("fixture-") {
        format!("user-{normalized}")
    } else {
        normalized.to_string()
    }
}

fn clean_tags(tags: &[String]) -> Vec<String> {
    let mut cleaned = Vec::new();
    for tag in tags {
        let value = tag.trim();
        if !value.is_empty() && !cleaned.iter().any(|existing| existing == value) {
            cleaned.push(value.to_string());
        }
    }
    cleaned
}

fn auth_label(kind: &CatalogSourceAuthKind, label: Option<&str>, configured: bool) -> String {
    if *kind == CatalogSourceAuthKind::None {
        if let Some(label) = label.map(str::trim).filter(|value| !value.is_empty()) {
            return label.to_string();
        }
    }
    if configured && *kind != CatalogSourceAuthKind::None {
        return "Credentials are configured outside renderer state.".to_string();
    }
    match kind {
        CatalogSourceAuthKind::None => "No authentication configured.".to_string(),
        CatalogSourceAuthKind::Basic => "Basic authentication metadata is configured.".to_string(),
        CatalogSourceAuthKind::Bearer => "Bearer token metadata is configured.".to_string(),
        CatalogSourceAuthKind::Cookie => {
            "Cookie authentication metadata is configured.".to_string()
        }
    }
}

fn fixture_for_root_href(href: &str) -> Option<CatalogSourceDefinition> {
    catalog_sources()
        .into_iter()
        .find(|source| source.root_href == href.trim())
}

fn is_supported_catalog_url(value: &str) -> bool {
    let url = value.trim();
    url.starts_with("https://") || url.starts_with("http://") || url.starts_with("fixture://")
}

fn connectivity_for_stored_source(source: &StoredCatalogSource) -> CatalogSourceConnectivityState {
    if source.auth.required && !source.auth.configured {
        return CatalogSourceConnectivityState {
            status: CatalogSourceConnectivityStatus::AuthRequired,
            label: "Authentication is required before this catalog can be browsed.".to_string(),
            checked_at: Some(source.updated_at),
            retryable: false,
        };
    }

    if fixture_for_root_href(&source.base_url).is_some() {
        return CatalogSourceConnectivityState {
            status: CatalogSourceConnectivityStatus::Available,
            label: "Configured source points at an allowlisted local catalog fixture.".to_string(),
            checked_at: Some(source.updated_at),
            retryable: false,
        };
    }

    if is_supported_catalog_url(&source.base_url) {
        return CatalogSourceConnectivityState {
            status: CatalogSourceConnectivityStatus::Unsupported,
            label: "Live OPDS network fetching is not enabled for configured catalog sources yet."
                .to_string(),
            checked_at: Some(source.updated_at),
            retryable: false,
        };
    }

    CatalogSourceConnectivityState {
        status: CatalogSourceConnectivityStatus::Invalid,
        label: "Catalog source URL must use http, https, or a bundled fixture URL.".to_string(),
        checked_at: Some(source.updated_at),
        retryable: false,
    }
}

fn source_from_stored(source: StoredCatalogSource) -> CatalogSource {
    let connectivity = connectivity_for_stored_source(&source);
    CatalogSource {
        id: source.id,
        kind: source.kind,
        title: source.title,
        base_url: source.base_url,
        description: source.description,
        connectivity,
        auth: source.auth,
        tags: source.tags,
        created_at: source.created_at,
        updated_at: source.updated_at,
    }
}

fn normalize_source_settings_input(
    input: CatalogSourceSettingsInput,
    existing: Option<&StoredCatalogSource>,
    now: u64,
) -> Result<StoredCatalogSource, CatalogErrorState> {
    let title = input.title.trim();
    let base_url = input.base_url.trim();
    if title.is_empty() {
        return Err(error_state(
            CatalogErrorCode::InvalidSource,
            "Catalog source title is required.",
            None,
            false,
        ));
    }
    if base_url.is_empty() || !is_supported_catalog_url(base_url) {
        return Err(error_state(
            CatalogErrorCode::InvalidSource,
            "Catalog source URL must use http, https, or a bundled fixture URL.",
            input.id.map(|id| id.trim().to_string()),
            false,
        ));
    }

    let auth_configured =
        matches!(input.auth_kind, CatalogSourceAuthKind::None) || input.auth_configured;
    let id = normalize_source_id(input.id.as_deref(), title);
    let created_at = existing.map(|source| source.created_at).unwrap_or(now);
    Ok(StoredCatalogSource {
        id,
        kind: input.kind,
        title: title.to_string(),
        base_url: base_url.to_string(),
        description: input
            .description
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty()),
        auth: CatalogSourceAuthState {
            kind: input.auth_kind.clone(),
            label: auth_label(
                &input.auth_kind,
                input.auth_label.as_deref(),
                auth_configured,
            ),
            configured: auth_configured,
            required: input.auth_required
                && !matches!(input.auth_kind, CatalogSourceAuthKind::None),
        },
        tags: clean_tags(&input.tags),
        created_at,
        updated_at: now,
    })
}

fn error_state(
    code: CatalogErrorCode,
    message: impl Into<String>,
    source_id: Option<String>,
    retryable: bool,
) -> CatalogErrorState {
    CatalogErrorState {
        code,
        message: message.into(),
        source_id,
        retryable,
    }
}

fn empty_error_page(
    source: CatalogSource,
    page_id: impl Into<String>,
    error: CatalogErrorState,
) -> CatalogPage {
    CatalogPage {
        source,
        entries: Vec::new(),
        pagination: CatalogPagination {
            page_id: page_id.into(),
            title: None,
            self_href: None,
            next_href: None,
            previous_href: None,
            total_results: Some(0),
            items_per_page: Some(0),
            start_index: Some(1),
        },
        search: None,
        auth_challenge: None,
        error: Some(error),
    }
}

fn invalid_source_page(source_id: &str) -> CatalogPage {
    let source = CatalogSource {
        id: source_id.trim().to_string(),
        kind: CatalogConnectorKind::Opds,
        title: "Invalid catalog source".to_string(),
        base_url: String::new(),
        description: None,
        auth: CatalogSourceAuthState {
            kind: CatalogSourceAuthKind::None,
            label: "Unknown source".to_string(),
            configured: false,
            required: false,
        },
        connectivity: CatalogSourceConnectivityState {
            status: CatalogSourceConnectivityStatus::Invalid,
            label: "Unknown source".to_string(),
            checked_at: None,
            retryable: false,
        },
        tags: Vec::new(),
        created_at: 0,
        updated_at: 0,
    };
    empty_error_page(
        source,
        "invalid-source",
        error_state(
            CatalogErrorCode::InvalidSource,
            "Catalog source is not allowlisted for this desktop build.",
            Some(source_id.trim().to_string()),
            false,
        ),
    )
}

fn invalid_page_for_source(
    definition: &CatalogSourceDefinition,
    page_href: Option<&str>,
) -> CatalogPage {
    let source = source_from_definition(definition);
    empty_error_page(
        source,
        page_href.unwrap_or(definition.root_href),
        error_state(
            CatalogErrorCode::InvalidSource,
            "Catalog page href is not part of the allowlisted fixture source.",
            Some(definition.id.to_string()),
            false,
        ),
    )
}

fn attr_value(event: &BytesStart<'_>, name: &[u8]) -> Option<String> {
    event
        .attributes()
        .flatten()
        .find(|attr| attr.key == QName(name))
        .map(|attr| {
            String::from_utf8_lossy(attr.value.as_ref())
                .trim()
                .to_string()
        })
        .filter(|value| !value.is_empty())
}

fn text_value(text: Cow<'_, [u8]>) -> String {
    String::from_utf8_lossy(text.as_ref()).trim().to_string()
}

fn parse_length(value: Option<String>) -> Option<u64> {
    value.and_then(|value| value.parse::<u64>().ok())
}

fn map_link_rel(raw: Option<&str>) -> CatalogEntryLinkRel {
    let rel = raw.unwrap_or("alternate").trim();
    match rel {
        "self" => CatalogEntryLinkRel::SelfLink,
        "start" => CatalogEntryLinkRel::Start,
        "next" => CatalogEntryLinkRel::Next,
        "previous" => CatalogEntryLinkRel::Previous,
        "search" => CatalogEntryLinkRel::Search,
        "related" => CatalogEntryLinkRel::Related,
        value if value.contains("acquisition") => CatalogEntryLinkRel::Acquisition,
        value if value.contains("image/thumbnail") => CatalogEntryLinkRel::Thumbnail,
        value if value.contains("image") => CatalogEntryLinkRel::Image,
        _ => CatalogEntryLinkRel::Alternate,
    }
}

fn supports_import(rel: &CatalogEntryLinkRel, media_type: Option<&str>) -> bool {
    if *rel == CatalogEntryLinkRel::Acquisition {
        return true;
    }
    matches!(
        media_type.unwrap_or_default(),
        "application/epub+zip"
            | "application/pdf"
            | "application/fb2+xml"
            | "application/x-cbz"
            | "application/vnd.comicbook+zip"
    )
}

fn link_from_event(event: &BytesStart<'_>) -> Option<CatalogEntryLink> {
    let href = attr_value(event, b"href")?;
    let raw_rel = attr_value(event, b"rel");
    let rel = map_link_rel(raw_rel.as_deref());
    let media_type = attr_value(event, b"type");
    Some(CatalogEntryLink {
        rel: rel.clone(),
        href,
        title: attr_value(event, b"title"),
        media_type: media_type.clone(),
        length: parse_length(attr_value(event, b"length")),
        supports_import: supports_import(&rel, media_type.as_deref()),
    })
}

fn finish_entry(builder: EntryBuilder, source_id: &str, fallback_index: usize) -> CatalogEntry {
    let links = builder.links;
    let availability = if links.iter().any(|link| link.supports_import) {
        CatalogEntryAvailability::Available
    } else {
        CatalogEntryAvailability::Unknown
    };
    CatalogEntry {
        id: builder
            .id
            .filter(|value| !value.trim().is_empty())
            .unwrap_or_else(|| format!("{source_id}:entry:{fallback_index}")),
        source_id: source_id.to_string(),
        title: builder
            .title
            .unwrap_or_else(|| "Untitled catalog entry".to_string()),
        subtitle: builder.subtitle,
        summary: builder.summary,
        authors: builder.authors,
        language: builder.language,
        published_at: builder.published_at,
        updated_at: builder.updated_at,
        categories: builder.categories,
        links,
        availability,
    }
}

fn search_template(links: &[CatalogEntryLink]) -> Option<CatalogSearchTemplate> {
    let link = links
        .iter()
        .find(|link| link.rel == CatalogEntryLinkRel::Search)?;
    Some(CatalogSearchTemplate {
        href: link.href.clone(),
        media_type: link.media_type.clone(),
        query_parameter: if link.href.contains("{searchTerms}") {
            "searchTerms".to_string()
        } else {
            "q".to_string()
        },
    })
}

fn feed_link_href(links: &[CatalogEntryLink], rel: CatalogEntryLinkRel) -> Option<String> {
    links
        .iter()
        .find(|link| link.rel == rel)
        .map(|link| link.href.clone())
}

fn parse_opds_feed(
    source: CatalogSource,
    page_href: &str,
    raw: &str,
) -> Result<CatalogPage, CatalogErrorState> {
    let mut reader = Reader::from_str(raw);
    reader.config_mut().trim_text(true);

    let mut feed = FeedBuilder::default();
    let mut entry: Option<EntryBuilder> = None;
    let mut author: Option<AuthorBuilder> = None;
    let mut text_target: Option<TextTarget> = None;
    let mut entry_index = 0;

    loop {
        match reader.read_event() {
            Ok(Event::Start(event)) => match event.name() {
                QName(b"title") if entry.is_some() => text_target = Some(TextTarget::EntryTitle),
                QName(b"title") => text_target = Some(TextTarget::FeedTitle),
                QName(b"updated") if entry.is_some() => {
                    text_target = Some(TextTarget::EntryUpdated)
                }
                QName(b"updated") => text_target = Some(TextTarget::FeedUpdated),
                QName(b"id") if entry.is_some() => text_target = Some(TextTarget::EntryId),
                QName(b"summary") | QName(b"content") if entry.is_some() => {
                    text_target = Some(TextTarget::EntrySummary)
                }
                QName(b"subtitle") if entry.is_some() => {
                    text_target = Some(TextTarget::EntrySubtitle)
                }
                QName(b"language") | QName(b"dcterms:language") if entry.is_some() => {
                    text_target = Some(TextTarget::EntryLanguage)
                }
                QName(b"published") if entry.is_some() => {
                    text_target = Some(TextTarget::EntryPublished)
                }
                QName(b"author") if entry.is_some() => author = Some(AuthorBuilder::default()),
                QName(b"name") if author.is_some() => text_target = Some(TextTarget::AuthorName),
                QName(b"uri") if author.is_some() => text_target = Some(TextTarget::AuthorUri),
                QName(b"entry") => entry = Some(EntryBuilder::default()),
                QName(b"link") => {
                    if let Some(link) = link_from_event(&event) {
                        if let Some(entry) = entry.as_mut() {
                            entry.links.push(link);
                        } else {
                            feed.links.push(link);
                        }
                    }
                }
                QName(b"category") => {
                    if let Some(entry) = entry.as_mut() {
                        if let Some(term) =
                            attr_value(&event, b"term").or_else(|| attr_value(&event, b"label"))
                        {
                            entry.categories.push(term);
                        }
                    }
                }
                _ => {}
            },
            Ok(Event::Empty(event)) => match event.name() {
                QName(b"link") => {
                    if let Some(link) = link_from_event(&event) {
                        if let Some(entry) = entry.as_mut() {
                            entry.links.push(link);
                        } else {
                            feed.links.push(link);
                        }
                    }
                }
                QName(b"category") => {
                    if let Some(entry) = entry.as_mut() {
                        if let Some(term) =
                            attr_value(&event, b"term").or_else(|| attr_value(&event, b"label"))
                        {
                            entry.categories.push(term);
                        }
                    }
                }
                _ => {}
            },
            Ok(Event::End(event)) => match event.name() {
                QName(b"entry") => {
                    if let Some(entry_builder) = entry.take() {
                        feed.entries
                            .push(finish_entry(entry_builder, &source.id, entry_index));
                        entry_index += 1;
                    }
                    text_target = None;
                }
                QName(b"author") => {
                    if let (Some(entry), Some(author)) = (entry.as_mut(), author.take()) {
                        if let Some(name) = author.name.filter(|value| !value.trim().is_empty()) {
                            entry.authors.push(CatalogEntryAuthor {
                                name,
                                uri: author.uri,
                            });
                        }
                    }
                    text_target = None;
                }
                QName(b"title")
                | QName(b"updated")
                | QName(b"id")
                | QName(b"summary")
                | QName(b"content")
                | QName(b"subtitle")
                | QName(b"language")
                | QName(b"dcterms:language")
                | QName(b"published")
                | QName(b"name")
                | QName(b"uri") => text_target = None,
                _ => {}
            },
            Ok(Event::Text(text)) => {
                let value = text_value(text.into_inner());
                if value.is_empty() {
                    continue;
                }
                match text_target {
                    Some(TextTarget::FeedTitle) if feed.title.is_none() => feed.title = Some(value),
                    Some(TextTarget::FeedUpdated) if feed.updated.is_none() => {
                        feed.updated = Some(value)
                    }
                    Some(TextTarget::EntryId) => {
                        if let Some(entry) = entry.as_mut() {
                            if entry.id.is_none() {
                                entry.id = Some(value);
                            }
                        }
                    }
                    Some(TextTarget::EntryTitle) => {
                        if let Some(entry) = entry.as_mut() {
                            if entry.title.is_none() {
                                entry.title = Some(value);
                            }
                        }
                    }
                    Some(TextTarget::EntrySubtitle) => {
                        if let Some(entry) = entry.as_mut() {
                            if entry.subtitle.is_none() {
                                entry.subtitle = Some(value);
                            }
                        }
                    }
                    Some(TextTarget::EntrySummary) => {
                        if let Some(entry) = entry.as_mut() {
                            if entry.summary.is_none() {
                                entry.summary = Some(value);
                            }
                        }
                    }
                    Some(TextTarget::EntryLanguage) => {
                        if let Some(entry) = entry.as_mut() {
                            if entry.language.is_none() {
                                entry.language = Some(value);
                            }
                        }
                    }
                    Some(TextTarget::EntryPublished) => {
                        if let Some(entry) = entry.as_mut() {
                            if entry.published_at.is_none() {
                                entry.published_at = Some(value);
                            }
                        }
                    }
                    Some(TextTarget::EntryUpdated) => {
                        if let Some(entry) = entry.as_mut() {
                            if entry.updated_at.is_none() {
                                entry.updated_at = Some(value);
                            }
                        }
                    }
                    Some(TextTarget::AuthorName) => {
                        if let Some(author) = author.as_mut() {
                            if author.name.is_none() {
                                author.name = Some(value);
                            }
                        }
                    }
                    Some(TextTarget::AuthorUri) => {
                        if let Some(author) = author.as_mut() {
                            if author.uri.is_none() {
                                author.uri = Some(value);
                            }
                        }
                    }
                    _ => {}
                }
            }
            Ok(Event::Eof) => break,
            Ok(_) => {}
            Err(error) => {
                return Err(error_state(
                    CatalogErrorCode::InvalidFeed,
                    format!("Could not parse OPDS feed: {error}"),
                    Some(source.id),
                    false,
                ))
            }
        }
    }

    let total_results = feed.entries.len() as u64;
    Ok(CatalogPage {
        source,
        entries: feed.entries,
        pagination: CatalogPagination {
            page_id: page_href.to_string(),
            title: feed.title.clone(),
            self_href: feed_link_href(&feed.links, CatalogEntryLinkRel::SelfLink)
                .or_else(|| Some(page_href.to_string())),
            next_href: feed_link_href(&feed.links, CatalogEntryLinkRel::Next),
            previous_href: feed_link_href(&feed.links, CatalogEntryLinkRel::Previous),
            total_results: Some(total_results),
            items_per_page: Some(total_results),
            start_index: Some(1),
        },
        search: search_template(&feed.links),
        auth_challenge: None,
        error: None,
    })
}

fn browse_definition(definition: CatalogSourceDefinition, page_href: Option<&str>) -> CatalogPage {
    let Some(page) = find_page(&definition, page_href) else {
        return invalid_page_for_source(&definition, page_href);
    };
    let source = source_from_definition(&definition);
    parse_opds_feed(source.clone(), page.href, page.xml)
        .unwrap_or_else(|error| empty_error_page(source, page.href, error))
}

fn credential_kind(kind: &CatalogSourceAuthKind) -> Option<CatalogCredentialKind> {
    match kind {
        CatalogSourceAuthKind::None => None,
        CatalogSourceAuthKind::Basic => Some(CatalogCredentialKind::Basic),
        CatalogSourceAuthKind::Bearer => Some(CatalogCredentialKind::Bearer),
        CatalogSourceAuthKind::Cookie => Some(CatalogCredentialKind::Cookie),
    }
}

fn browse_user_source(source: StoredCatalogSource, page_href: Option<&str>) -> CatalogPage {
    let catalog_source = source_from_stored(source.clone());
    let requested_href = page_href
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .unwrap_or(&source.base_url);
    let connectivity = connectivity_for_stored_source(&source);

    if connectivity.status == CatalogSourceConnectivityStatus::AuthRequired {
        let mut page = empty_error_page(
            catalog_source,
            requested_href,
            error_state(
                CatalogErrorCode::AuthRequired,
                "Authentication is required before this catalog source can be browsed.",
                Some(source.id.clone()),
                false,
            ),
        );
        page.auth_challenge = credential_kind(&source.auth.kind).map(|kind| CatalogAuthChallenge {
            source_id: source.id,
            kind,
            realm: None,
            message: "Catalog credentials must be configured through a Tauri-owned persistence boundary before browsing.".to_string(),
        });
        return page;
    }

    let Some(definition) = fixture_for_root_href(&source.base_url) else {
        return empty_error_page(
            catalog_source,
            requested_href,
            error_state(
                match connectivity.status {
                    CatalogSourceConnectivityStatus::Invalid => CatalogErrorCode::InvalidSource,
                    CatalogSourceConnectivityStatus::Offline => CatalogErrorCode::Offline,
                    _ => CatalogErrorCode::Unsupported,
                },
                connectivity.label,
                Some(source.id),
                connectivity.retryable,
            ),
        );
    };

    let Some(page) = find_page(&definition, page_href.or(Some(source.base_url.as_str()))) else {
        return empty_error_page(
            catalog_source,
            requested_href,
            error_state(
                CatalogErrorCode::InvalidSource,
                "Catalog page href is not part of the configured allowlisted fixture source.",
                Some(source.id),
                false,
            ),
        );
    };
    parse_opds_feed(catalog_source.clone(), page.href, page.xml)
        .unwrap_or_else(|error| empty_error_page(catalog_source, page.href, error))
}

fn browse_resolved_source(source: ResolvedCatalogSource, page_href: Option<&str>) -> CatalogPage {
    match source {
        ResolvedCatalogSource::Fixture(definition) => browse_definition(definition, page_href),
        ResolvedCatalogSource::User(source) => browse_user_source(source, page_href),
    }
}

fn searchable_text(entry: &CatalogEntry) -> String {
    [
        Some(entry.title.as_str()),
        entry.subtitle.as_deref(),
        entry.summary.as_deref(),
        entry.language.as_deref(),
    ]
    .into_iter()
    .flatten()
    .chain(entry.authors.iter().map(|author| author.name.as_str()))
    .chain(entry.categories.iter().map(|category| category.as_str()))
    .collect::<Vec<_>>()
    .join(" ")
    .to_lowercase()
}

fn search_definition(
    definition: CatalogSourceDefinition,
    query: &str,
    page_href: Option<&str>,
) -> CatalogPage {
    let normalized_query = query
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase();
    let mut page = browse_definition(definition, page_href);
    if normalized_query.is_empty() || page.error.is_some() {
        return page;
    }
    page.entries = page
        .entries
        .into_iter()
        .filter(|entry| searchable_text(entry).contains(&normalized_query))
        .collect();
    page.pagination.page_id = format!("{}?search={}", page.pagination.page_id, normalized_query);
    page.pagination.title = Some(format!("Search: {normalized_query}"));
    page.pagination.total_results = Some(page.entries.len() as u64);
    page.pagination.items_per_page = Some(page.entries.len() as u64);
    page.pagination.next_href = None;
    page.pagination.previous_href = None;
    page
}

fn search_resolved_source(
    source: ResolvedCatalogSource,
    query: &str,
    page_href: Option<&str>,
) -> CatalogPage {
    let normalized_query = query
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
        .to_lowercase();
    let mut page = match source {
        ResolvedCatalogSource::Fixture(definition) => {
            search_definition(definition, query, page_href)
        }
        ResolvedCatalogSource::User(source) => browse_user_source(source, page_href),
    };
    if normalized_query.is_empty() || page.error.is_some() {
        return page;
    }
    page.entries = page
        .entries
        .into_iter()
        .filter(|entry| searchable_text(entry).contains(&normalized_query))
        .collect();
    page.pagination.page_id = format!("{}?search={}", page.pagination.page_id, normalized_query);
    page.pagination.title = Some(format!("Search: {normalized_query}"));
    page.pagination.total_results = Some(page.entries.len() as u64);
    page.pagination.items_per_page = Some(page.entries.len() as u64);
    page.pagination.next_href = None;
    page.pagination.previous_href = None;
    page
}

fn importable_link(entry: &CatalogEntry) -> Option<&CatalogEntryLink> {
    entry
        .links
        .iter()
        .find(|link| link.supports_import && link.rel == CatalogEntryLinkRel::Acquisition)
        .or_else(|| entry.links.iter().find(|link| link.supports_import))
}

fn create_import_intent_from_entry(entry: &CatalogEntry, created_at: u64) -> CatalogImportIntent {
    let Some(link) = importable_link(entry) else {
        return CatalogImportIntent {
            id: format!("catalog:{}:{}:blocked", entry.source_id, entry.id),
            source_id: entry.source_id.clone(),
            entry_id: entry.id.clone(),
            title: entry.title.clone(),
            acquisition_href: String::new(),
            media_type: None,
            file_name_hint: None,
            status: CatalogImportIntentStatus::Blocked,
            blocked_reason: Some(
                "This catalog entry does not expose an importable acquisition link.".to_string(),
            ),
            created_at,
        };
    };

    CatalogImportIntent {
        id: format!("catalog:{}:{}:{}", entry.source_id, entry.id, link.href).replace(' ', "-"),
        source_id: entry.source_id.clone(),
        entry_id: entry.id.clone(),
        title: entry.title.clone(),
        acquisition_href: link.href.clone(),
        media_type: link.media_type.clone(),
        file_name_hint: link.title.clone().or_else(|| Some(entry.title.clone())),
        status: CatalogImportIntentStatus::Ready,
        blocked_reason: None,
        created_at,
    }
}

fn blocked_import_intent(
    source_id: &str,
    entry_id: &str,
    reason: impl Into<String>,
) -> CatalogImportIntent {
    CatalogImportIntent {
        id: format!("catalog:{}:{}:blocked", source_id.trim(), entry_id.trim()),
        source_id: source_id.trim().to_string(),
        entry_id: entry_id.trim().to_string(),
        title: "Unavailable catalog entry".to_string(),
        acquisition_href: String::new(),
        media_type: None,
        file_name_hint: None,
        status: CatalogImportIntentStatus::Blocked,
        blocked_reason: Some(reason.into()),
        created_at: now_millis().unwrap_or_default(),
    }
}

fn settings_error_source(error: CatalogErrorState) -> CatalogSource {
    CatalogSource {
        id: "catalog-settings-error".to_string(),
        kind: CatalogConnectorKind::Opds,
        title: "Catalog settings unavailable".to_string(),
        base_url: String::new(),
        description: Some(error.message.clone()),
        auth: CatalogSourceAuthState {
            kind: CatalogSourceAuthKind::None,
            label: "No credentials read from unavailable settings.".to_string(),
            configured: false,
            required: false,
        },
        connectivity: CatalogSourceConnectivityState {
            status: CatalogSourceConnectivityStatus::Offline,
            label: error.message,
            checked_at: now_millis().ok(),
            retryable: error.retryable,
        },
        tags: vec!["settings-error".to_string()],
        created_at: 0,
        updated_at: 0,
    }
}

#[tauri::command]
pub(crate) async fn get_catalog_connector_status() -> CatalogConnectorStatus {
    CatalogConnectorStatus {
        status: CatalogConnectorStatusKind::Available,
        capabilities: vec![CatalogConnectorKind::Opds, CatalogConnectorKind::CalibreOpds],
        message: "Fixture-backed and user-configured OPDS/Calibre catalog sources are available without renderer-controlled network proxying.".to_string(),
        supports_search: true,
        supports_authentication: true,
        supports_import_intent: true,
        error: None,
    }
}

#[tauri::command]
pub(crate) async fn list_catalog_sources() -> Vec<CatalogSource> {
    let mut sources: Vec<CatalogSource> = catalog_sources()
        .iter()
        .map(source_from_definition)
        .collect();
    match read_user_catalog_sources(&catalog_sources_path()) {
        Ok(user_sources) => sources.extend(user_sources.into_iter().map(source_from_stored)),
        Err(error) => sources.push(settings_error_source(error)),
    }
    sources
}

#[tauri::command]
pub(crate) async fn save_catalog_source_settings(
    input: CatalogSourceSettingsInput,
) -> CatalogSourceSettingsResult {
    let path = catalog_sources_path();
    let now = now_millis().unwrap_or_default();
    let mut sources = match read_user_catalog_sources(&path) {
        Ok(sources) => sources,
        Err(error) => {
            return CatalogSourceSettingsResult {
                source: None,
                error: Some(error),
            }
        }
    };
    let normalized_id = normalize_source_id(input.id.as_deref(), &input.title);
    let existing = sources.iter().find(|source| source.id == normalized_id);
    let source = match normalize_source_settings_input(input, existing, now) {
        Ok(source) => source,
        Err(error) => {
            return CatalogSourceSettingsResult {
                source: None,
                error: Some(error),
            }
        }
    };
    sources.retain(|existing| existing.id != source.id);
    sources.push(source.clone());
    sources.sort_by(|left, right| left.title.cmp(&right.title));
    if let Err(error) = write_user_catalog_sources(&path, &sources) {
        return CatalogSourceSettingsResult {
            source: None,
            error: Some(error),
        };
    }
    CatalogSourceSettingsResult {
        source: Some(source_from_stored(source)),
        error: None,
    }
}

#[tauri::command]
pub(crate) async fn remove_catalog_source_settings(
    source_id: String,
) -> CatalogSourceSettingsResult {
    let path = catalog_sources_path();
    let mut sources = match read_user_catalog_sources(&path) {
        Ok(sources) => sources,
        Err(error) => {
            return CatalogSourceSettingsResult {
                source: None,
                error: Some(error),
            }
        }
    };
    let source_id = source_id.trim();
    let removed = sources
        .iter()
        .find(|source| source.id == source_id)
        .cloned()
        .map(source_from_stored);
    sources.retain(|source| source.id != source_id);
    if let Err(error) = write_user_catalog_sources(&path, &sources) {
        return CatalogSourceSettingsResult {
            source: removed,
            error: Some(error),
        };
    }
    CatalogSourceSettingsResult {
        source: removed,
        error: None,
    }
}

#[tauri::command]
pub(crate) async fn browse_catalog_source(request: CatalogBrowseRequest) -> CatalogPage {
    let source = match find_source(&request.source_id) {
        Ok(Some(source)) => source,
        Ok(None) => return invalid_source_page(&request.source_id),
        Err(error) => {
            return empty_error_page(
                invalid_source_page(&request.source_id).source,
                request.page_href.as_deref().unwrap_or("settings-error"),
                error,
            )
        }
    };
    browse_resolved_source(source, request.page_href.as_deref())
}

#[tauri::command]
pub(crate) async fn search_catalog_source(request: CatalogSearchRequest) -> CatalogPage {
    let source = match find_source(&request.source_id) {
        Ok(Some(source)) => source,
        Ok(None) => return invalid_source_page(&request.source_id),
        Err(error) => {
            return empty_error_page(
                invalid_source_page(&request.source_id).source,
                request.page_href.as_deref().unwrap_or("settings-error"),
                error,
            )
        }
    };
    search_resolved_source(source, &request.query, request.page_href.as_deref())
}

#[tauri::command]
pub(crate) async fn create_catalog_import_intent(
    request: CatalogImportIntentRequest,
) -> CatalogImportIntent {
    resolve_catalog_import_intent(&request)
}

fn resolve_catalog_import_intent(request: &CatalogImportIntentRequest) -> CatalogImportIntent {
    let source = match find_source(&request.source_id) {
        Ok(Some(source)) => source,
        Ok(None) => {
            return blocked_import_intent(
                &request.source_id,
                &request.entry_id,
                "Catalog source is not allowlisted for this desktop build.",
            )
        }
        Err(error) => {
            return blocked_import_intent(&request.source_id, &request.entry_id, error.message)
        }
    };
    let page = browse_resolved_source(source, request.page_href.as_deref());
    if page.error.is_some() {
        return blocked_import_intent(
            &request.source_id,
            &request.entry_id,
            "Catalog page is not available for import intent conversion.",
        );
    }
    page.entries
        .iter()
        .find(|entry| entry.id == request.entry_id.trim())
        .map(|entry| create_import_intent_from_entry(entry, now_millis().unwrap_or_default()))
        .unwrap_or_else(|| {
            blocked_import_intent(
                &request.source_id,
                &request.entry_id,
                "Catalog entry was not found in the requested safe catalog page.",
            )
        })
}

fn catalog_acquisitions_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let root = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("catalog-acquisitions");
    fs::create_dir_all(&root).map_err(|error| error.to_string())?;
    Ok(root)
}

fn catalog_acquisition_file_name(intent: &CatalogImportIntent) -> String {
    let raw_name = intent
        .file_name_hint
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
        .or_else(|| {
            intent
                .acquisition_href
                .split('/')
                .next_back()
                .map(str::trim)
                .filter(|value| !value.is_empty())
        })
        .unwrap_or("catalog-book");
    let safe_name = sanitize_filename(raw_name);
    let storage_key = reader_storage_component_key(&intent.acquisition_href);
    format!("{storage_key}-{safe_name}")
}

fn fixture_catalog_acquisition_payload(intent: &CatalogImportIntent) -> Option<&'static [u8]> {
    match intent.acquisition_href.trim() {
        "fixture://opds/files/fixture-one.epub" => Some(SAMPLE_FIXTURE_EPUB),
        "fixture://opds/files/fixture-three.pdf" => Some(SAMPLE_FIXTURE_PDF),
        "fixture://calibre/files/calibre-fixture.epub" => Some(SAMPLE_FIXTURE_EPUB),
        "fixture://calibre/files/calibre-fixture.pdf" => Some(SAMPLE_FIXTURE_PDF),
        _ => None,
    }
}

fn materialize_catalog_acquisition_source(
    app: &tauri::AppHandle,
    intent: &CatalogImportIntent,
) -> Result<PathBuf, String> {
    let payload = fixture_catalog_acquisition_payload(intent).ok_or_else(|| {
        "Catalog acquisition is not allowlisted for desktop import execution.".to_string()
    })?;
    let path = catalog_acquisitions_root(app)?.join(catalog_acquisition_file_name(intent));
    fs::write(&path, payload).map_err(|error| error.to_string())?;
    fs::canonicalize(&path).map_err(|error| error.to_string())
}

#[tauri::command]
pub(crate) fn import_catalog_entry_to_library(
    app: tauri::AppHandle,
    request: CatalogImportIntentRequest,
) -> Result<Vec<LibraryBookRecord>, String> {
    let intent = resolve_catalog_import_intent(&request);
    if intent.status == CatalogImportIntentStatus::Blocked {
        return Err(intent
            .blocked_reason
            .unwrap_or_else(|| "Catalog entry is not importable.".to_string()));
    }

    let source_path = materialize_catalog_acquisition_source(&app, &intent)?;
    register_trusted_library_import_path(&app, &source_path)?;
    import_library_books(app, vec![source_path.to_string_lossy().to_string()])
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_catalog_settings_path(name: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("br1-{name}-{nonce}.json"))
    }

    #[test]
    fn parses_opds_fixture_feed_with_pagination_and_search() {
        let source = source_from_definition(&find_fixture_source("fixture-opds").unwrap());
        let page = parse_opds_feed(source, "fixture://opds/root.xml", OPDS_FIXTURE_ROOT).unwrap();

        assert_eq!(page.source.kind, CatalogConnectorKind::Opds);
        assert_eq!(
            page.pagination.title.as_deref(),
            Some("Readest Fixture Catalog")
        );
        assert_eq!(
            page.pagination.next_href.as_deref(),
            Some("fixture://opds/next.xml")
        );
        assert_eq!(page.search.unwrap().query_parameter, "searchTerms");
        assert_eq!(page.entries.len(), 2);
        assert_eq!(page.entries[0].title, "Fixture EPUB One");
        assert_eq!(page.entries[0].authors[0].name, "Ada Catalog");
        assert_eq!(
            page.entries[0].availability,
            CatalogEntryAvailability::Available
        );
        assert!(page.entries[0]
            .links
            .iter()
            .any(|link| { link.rel == CatalogEntryLinkRel::Acquisition && link.supports_import }));
    }

    #[test]
    fn searches_fixture_entries_without_network_fetching() {
        let definition = find_fixture_source("fixture-opds").unwrap();
        let page = search_definition(definition, "rust", None);

        assert_eq!(page.entries.len(), 1);
        assert_eq!(page.entries[0].id, "urn:fixture:opds:two");
        assert!(page.pagination.next_href.is_none());
    }

    #[test]
    fn parses_calibre_compatible_source_through_same_flow() {
        let page = browse_definition(find_fixture_source("fixture-calibre").unwrap(), None);

        assert_eq!(page.source.kind, CatalogConnectorKind::CalibreOpds);
        assert_eq!(page.entries.len(), 2);
        assert_eq!(page.entries[0].title, "Calibre Fixture EPUB");
        assert_eq!(
            page.entries[0].links[0].media_type.as_deref(),
            Some("application/epub+zip")
        );
    }

    #[test]
    fn converts_catalog_entry_to_import_intent() {
        let page = browse_definition(find_fixture_source("fixture-calibre").unwrap(), None);
        let intent = create_import_intent_from_entry(&page.entries[0], 42);

        assert_eq!(intent.status, CatalogImportIntentStatus::Ready);
        assert_eq!(intent.source_id, "fixture-calibre");
        assert_eq!(intent.entry_id, "urn:calibre:book:1");
        assert_eq!(
            intent.acquisition_href,
            "fixture://calibre/files/calibre-fixture.epub"
        );
        assert_eq!(intent.created_at, 42);
    }

    #[test]
    fn rejects_non_allowlisted_page_href() {
        let page = browse_definition(
            find_fixture_source("fixture-opds").unwrap(),
            Some("https://example.invalid/catalog.xml"),
        );

        assert!(page.error.is_some());
        assert!(page.entries.is_empty());
    }

    #[test]
    fn normalizes_and_persists_user_catalog_source_without_secrets() {
        let path = temp_catalog_settings_path("catalog-persist");
        let input = CatalogSourceSettingsInput {
            id: Some(" My Calibre Shelf ".to_string()),
            kind: CatalogConnectorKind::CalibreOpds,
            title: "  My Calibre Shelf  ".to_string(),
            base_url: " fixture://calibre/root.xml ".to_string(),
            description: Some("  local test shelf  ".to_string()),
            auth_kind: CatalogSourceAuthKind::Basic,
            auth_label: Some("  password saved in keychain  ".to_string()),
            auth_configured: true,
            auth_required: true,
            tags: vec![
                " calibre ".to_string(),
                "opds".to_string(),
                "calibre".to_string(),
            ],
        };
        let source = normalize_source_settings_input(input, None, 505).unwrap();
        write_user_catalog_sources(&path, &[source.clone()]).unwrap();

        let persisted = read_user_catalog_sources(&path).unwrap();
        assert_eq!(persisted.len(), 1);
        assert_eq!(persisted[0].id, "my-calibre-shelf");
        assert_eq!(persisted[0].title, "My Calibre Shelf");
        assert_eq!(persisted[0].base_url, "fixture://calibre/root.xml");
        assert_eq!(persisted[0].auth.kind, CatalogSourceAuthKind::Basic);
        assert!(persisted[0].auth.configured);
        assert_eq!(
            persisted[0].auth.label,
            "Credentials are configured outside renderer state."
        );
        assert_eq!(persisted[0].tags, vec!["calibre", "opds"]);
        assert!(!serde_json::to_string(&persisted)
            .unwrap()
            .contains("secret"));

        let catalog_source = source_from_stored(source);
        assert_eq!(
            catalog_source.connectivity.status,
            CatalogSourceConnectivityStatus::Available
        );
        let _ = fs::remove_file(path);
    }

    #[test]
    fn configured_calibre_fixture_browses_through_same_catalog_flow() {
        let source = StoredCatalogSource {
            id: "custom-calibre".to_string(),
            kind: CatalogConnectorKind::CalibreOpds,
            title: "Custom Calibre".to_string(),
            base_url: "fixture://calibre/root.xml".to_string(),
            description: None,
            auth: CatalogSourceAuthState {
                kind: CatalogSourceAuthKind::None,
                label: "No authentication configured.".to_string(),
                configured: true,
                required: false,
            },
            tags: vec!["calibre".to_string()],
            created_at: 1,
            updated_at: 2,
        };

        let page = browse_user_source(source, None);
        assert!(page.error.is_none());
        assert_eq!(page.source.id, "custom-calibre");
        assert_eq!(page.entries.len(), 2);
        assert!(page
            .entries
            .iter()
            .all(|entry| entry.source_id == "custom-calibre"));
    }

    #[test]
    fn live_catalog_url_returns_unsupported_without_proxying() {
        let source = StoredCatalogSource {
            id: "live-calibre".to_string(),
            kind: CatalogConnectorKind::CalibreOpds,
            title: "Live Calibre".to_string(),
            base_url: "https://calibre.example.invalid/opds".to_string(),
            description: None,
            auth: CatalogSourceAuthState {
                kind: CatalogSourceAuthKind::None,
                label: "No authentication configured.".to_string(),
                configured: true,
                required: false,
            },
            tags: Vec::new(),
            created_at: 1,
            updated_at: 2,
        };

        let page = browse_user_source(source, None);
        let error = page.error.unwrap();
        assert_eq!(error.code, CatalogErrorCode::Unsupported);
        assert!(page.entries.is_empty());
        assert_eq!(
            page.source.connectivity.status,
            CatalogSourceConnectivityStatus::Unsupported
        );
    }

    #[test]
    fn corrupted_source_settings_return_product_error_state() {
        let path = temp_catalog_settings_path("catalog-corrupt");
        fs::write(&path, "{not-json").unwrap();

        let error = read_user_catalog_sources(&path).unwrap_err();
        assert_eq!(error.code, CatalogErrorCode::InvalidSource);
        assert!(!error.retryable);

        let listed = settings_error_source(error);
        assert_eq!(
            listed.connectivity.status,
            CatalogSourceConnectivityStatus::Offline
        );
        assert!(listed.description.unwrap().contains("not valid JSON"));
        let _ = fs::remove_file(path);
    }

    #[test]
    fn auth_required_catalog_source_returns_challenge_state() {
        let source = StoredCatalogSource {
            id: "locked-calibre".to_string(),
            kind: CatalogConnectorKind::CalibreOpds,
            title: "Locked Calibre".to_string(),
            base_url: "fixture://calibre/root.xml".to_string(),
            description: None,
            auth: CatalogSourceAuthState {
                kind: CatalogSourceAuthKind::Basic,
                label: "Basic authentication metadata is configured.".to_string(),
                configured: false,
                required: true,
            },
            tags: Vec::new(),
            created_at: 1,
            updated_at: 2,
        };

        let page = browse_user_source(source, None);
        let error = page.error.unwrap();
        assert_eq!(error.code, CatalogErrorCode::AuthRequired);
        assert!(page.entries.is_empty());
        assert!(page.auth_challenge.is_some());
        assert_eq!(
            page.source.connectivity.status,
            CatalogSourceConnectivityStatus::AuthRequired
        );
    }

    #[test]
    fn fixture_catalog_import_payloads_cover_allowlisted_acquisitions() {
        for href in [
            "fixture://opds/files/fixture-one.epub",
            "fixture://opds/files/fixture-three.pdf",
            "fixture://calibre/files/calibre-fixture.epub",
            "fixture://calibre/files/calibre-fixture.pdf",
        ] {
            let intent = CatalogImportIntent {
                id: "catalog:test".to_string(),
                source_id: "fixture".to_string(),
                entry_id: "entry".to_string(),
                title: "Fixture".to_string(),
                acquisition_href: href.to_string(),
                media_type: None,
                file_name_hint: Some(
                    href.split('/').next_back().unwrap_or("fixture-book").to_string(),
                ),
                status: CatalogImportIntentStatus::Ready,
                blocked_reason: None,
                created_at: 0,
            };

            let payload = fixture_catalog_acquisition_payload(&intent);
            assert!(payload.is_some());
            assert!(!payload.unwrap().is_empty());
            assert!(catalog_acquisition_file_name(&intent).contains('-'));
        }
    }

    #[test]
    fn unsupported_catalog_acquisition_payload_is_rejected() {
        let intent = CatalogImportIntent {
            id: "catalog:test".to_string(),
            source_id: "fixture".to_string(),
            entry_id: "entry".to_string(),
            title: "Fixture".to_string(),
            acquisition_href: "https://example.invalid/book.epub".to_string(),
            media_type: Some("application/epub+zip".to_string()),
            file_name_hint: Some("book.epub".to_string()),
            status: CatalogImportIntentStatus::Ready,
            blocked_reason: None,
            created_at: 0,
        };

        assert!(fixture_catalog_acquisition_payload(&intent).is_none());
    }
}
