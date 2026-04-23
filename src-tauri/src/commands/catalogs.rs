#![allow(dead_code)]

use serde::{Deserialize, Serialize};

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
    pub tags: Vec<String>,
    pub created_at: u64,
    pub updated_at: u64,
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum CatalogConnectorKind {
    Opds,
    CalibreOpds,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum CatalogSourceAuthKind {
    None,
    Basic,
    Bearer,
    Cookie,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum CatalogCredentialKind {
    Basic,
    Bearer,
    Cookie,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum CatalogEntryAvailability {
    Unknown,
    Available,
    Borrowed,
    Reserved,
    Unavailable,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
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

#[tauri::command]
pub(crate) async fn get_catalog_connector_status() -> CatalogConnectorStatus {
    let message = "Catalog connector commands are registered, but OPDS and Calibre browsing are not implemented yet.".to_string();

    CatalogConnectorStatus {
        status: CatalogConnectorStatusKind::Unavailable,
        capabilities: Vec::new(),
        message: message.clone(),
        supports_search: false,
        supports_authentication: false,
        supports_import_intent: false,
        error: Some(CatalogErrorState {
            code: CatalogErrorCode::Unavailable,
            message,
            source_id: None,
            retryable: false,
        }),
    }
}
