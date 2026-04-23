#![allow(dead_code)]

use crate::util::now_millis;
use quick_xml::events::BytesStart;
use quick_xml::events::Event;
use quick_xml::name::QName;
use quick_xml::Reader;
use serde::{Deserialize, Serialize};
use std::borrow::Cow;

const OPDS_FIXTURE_ROOT: &str = include_str!("../../tests/fixtures/catalogs/opds-root.xml");
const OPDS_FIXTURE_NEXT: &str = include_str!("../../tests/fixtures/catalogs/opds-next.xml");
const CALIBRE_FIXTURE_ROOT: &str = include_str!("../../tests/fixtures/catalogs/calibre-root.xml");

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
        tags: definition.tags.iter().map(|tag| tag.to_string()).collect(),
        created_at: 0,
        updated_at: 0,
    }
}

fn find_source(source_id: &str) -> Option<CatalogSourceDefinition> {
    catalog_sources()
        .into_iter()
        .find(|source| source.id == source_id.trim())
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

#[tauri::command]
pub(crate) async fn get_catalog_connector_status() -> CatalogConnectorStatus {
    CatalogConnectorStatus {
        status: CatalogConnectorStatusKind::Available,
        capabilities: vec![CatalogConnectorKind::Opds, CatalogConnectorKind::CalibreOpds],
        message: "Fixture-backed OPDS and Calibre OPDS catalog browsing is available without network proxying.".to_string(),
        supports_search: true,
        supports_authentication: false,
        supports_import_intent: true,
        error: None,
    }
}

#[tauri::command]
pub(crate) async fn list_catalog_sources() -> Vec<CatalogSource> {
    catalog_sources()
        .iter()
        .map(source_from_definition)
        .collect()
}

#[tauri::command]
pub(crate) async fn browse_catalog_source(request: CatalogBrowseRequest) -> CatalogPage {
    let Some(definition) = find_source(&request.source_id) else {
        return invalid_source_page(&request.source_id);
    };
    browse_definition(definition, request.page_href.as_deref())
}

#[tauri::command]
pub(crate) async fn search_catalog_source(request: CatalogSearchRequest) -> CatalogPage {
    let Some(definition) = find_source(&request.source_id) else {
        return invalid_source_page(&request.source_id);
    };
    search_definition(definition, &request.query, request.page_href.as_deref())
}

#[tauri::command]
pub(crate) async fn create_catalog_import_intent(
    request: CatalogImportIntentRequest,
) -> CatalogImportIntent {
    let Some(definition) = find_source(&request.source_id) else {
        return blocked_import_intent(
            &request.source_id,
            &request.entry_id,
            "Catalog source is not allowlisted for this desktop build.",
        );
    };
    let page = browse_definition(definition, request.page_href.as_deref());
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parses_opds_fixture_feed_with_pagination_and_search() {
        let source = source_from_definition(&find_source("fixture-opds").unwrap());
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
        let definition = find_source("fixture-opds").unwrap();
        let page = search_definition(definition, "rust", None);

        assert_eq!(page.entries.len(), 1);
        assert_eq!(page.entries[0].id, "urn:fixture:opds:two");
        assert!(page.pagination.next_href.is_none());
    }

    #[test]
    fn parses_calibre_compatible_source_through_same_flow() {
        let page = browse_definition(find_source("fixture-calibre").unwrap(), None);

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
        let page = browse_definition(find_source("fixture-calibre").unwrap(), None);
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
            find_source("fixture-opds").unwrap(),
            Some("https://example.invalid/catalog.xml"),
        );

        assert!(page.error.is_some());
        assert!(page.entries.is_empty());
    }
}
