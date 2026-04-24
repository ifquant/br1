use crate::models::{
    ApplyKoReaderSyncExchangeResult, ApplySyncSnapshotRequest, ApplySyncSnapshotResult,
    KoReaderSyncConflictResult, KoReaderSyncExchangeExportDialogResult,
    LibraryBookRecord, ReaderBookmarksEntry, ReaderBookmarkKoReaderMetadataRecord,
    ReaderBookmarkRecord, ReaderHighlightsWorkspaceEntry, ReaderHighlightsWorkspaceStateRecord,
    ReaderNoteRecord, ReaderNotesEntry, RestoreKoReaderSyncExchangeDialogResult,
    RestoreSyncSnapshotDialogResult,
    SyncSnapshotBookmarksStateRecord, SyncSnapshotDocument, SyncSnapshotExportDialogResult,
    SyncSnapshotHighlightsWorkspaceRecord, SyncSnapshotImportDialogResult,
    SyncSnapshotNotesStateRecord, SyncSnapshotRecord,
    BR1_SYNC_SNAPSHOT_SCHEMA_VERSION,
    READER_BOOKMARKS_SCHEMA_VERSION, READER_HIGHLIGHTS_WORKSPACE_SCHEMA_VERSION, READER_NOTES_SCHEMA_VERSION,
};
use crate::util::{
    ensure_library_root, library_json_path, load_library_records, now_millis, reader_bookmarks_root,
    reader_highlights_workspace_root, reader_notes_root, reader_storage_component_key,
    save_library_records, sync_snapshots_root,
};
use serde::de::DeserializeOwned;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use tauri_plugin_dialog::DialogExt;

const SYNC_SNAPSHOT_DIALOG_EXTENSIONS: &[&str] = &["json"];
const KOREADER_SYNC_EXCHANGE_SCHEMA_VERSION: u64 = 1;
const READER_SETTINGS_STORAGE_KEY: &str = "br1.reader.settings";

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SyncSnapshotLibraryMetadataPayload {
    id: String,
    title: String,
    author: String,
    format: String,
    description: Option<String>,
    language: Option<String>,
    publisher: Option<String>,
    #[serde(default)]
    collection: Option<String>,
    #[serde(default)]
    tags: Vec<String>,
    file_path: String,
    cover_path: Option<String>,
    source_path: Option<String>,
    imported_at: u64,
    #[serde(default)]
    library_file_exists: Option<bool>,
    #[serde(default)]
    source_file_exists: Option<bool>,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SyncSnapshotReadingStatePayload {
    id: String,
    file_path: String,
    progress: String,
    status: String,
    progress_fraction: Option<f64>,
    progress_location: Option<String>,
    #[serde(default)]
    koreader_progress_location: Option<String>,
    last_opened_at: Option<u64>,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct SyncSnapshotReaderSettingsPayload {
    storage_key: String,
    settings: serde_json::Value,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct KoReaderExchangeConfigPayload {
    progress: serde_json::Value,
    xpointer: String,
    updated_at: u64,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct KoReaderExchangeIdentityPayload {
    book_hash: String,
    meta_hash: String,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct KoReaderExchangeAnnotationPayload {
    id: String,
    #[serde(rename = "type")]
    kind: String,
    xpointer0: String,
    #[serde(default)]
    xpointer1: Option<String>,
    text: String,
    note: String,
    #[serde(default)]
    page: Option<u64>,
    #[serde(default)]
    style: Option<String>,
    #[serde(default)]
    color: Option<String>,
    created_at: u64,
    updated_at: u64,
    #[serde(default)]
    deleted_at: Option<u64>,
    #[serde(flatten)]
    identity: KoReaderExchangeIdentityPayload,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct KoReaderExchangeBookPayload {
    book_id: String,
    file_path: String,
    #[serde(default)]
    source_path: Option<String>,
    title: String,
    author: String,
    format: String,
    koreader: KoReaderExchangeBookStatePayload,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct KoReaderExchangeBookStatePayload {
    config: KoReaderExchangeConfigPayload,
    #[serde(default)]
    annotations: Vec<KoReaderExchangeAnnotationPayload>,
}

#[derive(Debug, Clone, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct KoReaderExchangeDocumentPayload {
    schema_version: u64,
    books: Vec<KoReaderExchangeBookPayload>,
}

#[derive(Debug, Clone)]
struct KoReaderExchangeConflict {
    kind: String,
    book_title: String,
    book_author: String,
    book_format: String,
    detail: String,
}

fn sync_snapshot_file_name(exported_at: u64) -> String {
    format!("br1-sync-snapshot-{exported_at}.json")
}

fn koreader_sync_exchange_file_name(exported_at: u64) -> String {
    format!("br1-koreader-sync-{exported_at}.json")
}

fn resolve_dialog_file_path(file_path: tauri_plugin_dialog::FilePath) -> Result<PathBuf, String> {
    file_path.into_path().map_err(|error| error.to_string())
}

fn validate_sync_snapshot(snapshot: &SyncSnapshotDocument) -> Result<(), String> {
    if snapshot.schema_version != BR1_SYNC_SNAPSHOT_SCHEMA_VERSION {
        return Err(format!(
            "Unsupported sync snapshot schema version: {}",
            snapshot.schema_version
        ));
    }

    let mut seen_ids = HashSet::new();
    for (index, record) in snapshot.records.iter().enumerate() {
        if record.schema_version != BR1_SYNC_SNAPSHOT_SCHEMA_VERSION {
            return Err(format!(
                "Snapshot record {} has unsupported schema version {}",
                index + 1,
                record.schema_version
            ));
        }
        if record.kind.trim().is_empty() {
            return Err(format!("Snapshot record {} is missing a kind", index + 1));
        }
        if record.id.trim().is_empty() {
            return Err(format!("Snapshot record {} is missing an id", index + 1));
        }
        if !seen_ids.insert(record.id.clone()) {
            return Err(format!("Snapshot contains duplicate record id {}", record.id));
        }
    }

    Ok(())
}

fn parse_sync_snapshot_document(raw: &str) -> Result<SyncSnapshotDocument, String> {
    let snapshot: SyncSnapshotDocument =
        serde_json::from_str(raw).map_err(|error| format!("Snapshot is not valid JSON: {error}"))?;
    validate_sync_snapshot(&snapshot)?;
    Ok(snapshot)
}

fn deserialize_record_payload<T: DeserializeOwned>(
    record: &SyncSnapshotRecord,
    label: &str,
) -> Result<T, String> {
    serde_json::from_value(record.payload.clone())
        .map_err(|error| format!("Snapshot {label} record {} has invalid payload: {error}", record.id))
}

fn scope_string<'a>(record: &'a SyncSnapshotRecord, key: &str) -> Option<&'a str> {
    record
        .scope
        .as_ref()
        .and_then(|scope| scope.get(key))
        .and_then(|value| value.as_str())
        .map(str::trim)
        .filter(|value| !value.is_empty())
}

fn prepare_apply_sync_snapshot_request(
    snapshot: &SyncSnapshotDocument,
) -> Result<(ApplySyncSnapshotRequest, Option<SyncSnapshotRecord>), String> {
    validate_sync_snapshot(snapshot)?;

    let mut metadata_records = Vec::new();
    let mut metadata_book_ids = HashSet::new();
    let mut metadata_file_paths = HashSet::new();
    let mut metadata_by_book_id = std::collections::HashMap::new();
    let mut reading_state_by_book_id = std::collections::HashMap::new();
    let mut bookmark_records = Vec::new();
    let mut bookmark_keys = HashSet::new();
    let mut note_records = Vec::new();
    let mut note_keys = HashSet::new();
    let mut highlights_records = Vec::new();
    let mut highlights_keys = HashSet::new();
    let mut reader_settings = None;

    for record in &snapshot.records {
        match record.kind.as_str() {
            "library-book" => {
                let payload: SyncSnapshotLibraryMetadataPayload =
                    deserialize_record_payload(record, "library-book")?;
                if record.id != format!("library-book:{}", payload.id) {
                    return Err(format!(
                        "Snapshot library-book record {} does not match payload id {}.",
                        record.id, payload.id
                    ));
                }
                if let Some(scope_book_id) = scope_string(record, "bookId") {
                    if scope_book_id != payload.id {
                        return Err(format!(
                            "Snapshot library-book record {} has mismatched scope bookId {}.",
                            record.id, scope_book_id
                        ));
                    }
                }
                if !metadata_book_ids.insert(payload.id.clone()) {
                    return Err(format!(
                        "Snapshot contains duplicate library metadata for book {}.",
                        payload.id
                    ));
                }
                if !metadata_file_paths.insert(payload.file_path.clone()) {
                    return Err(format!(
                        "Snapshot contains duplicate library filePath {}.",
                        payload.file_path
                    ));
                }
                metadata_records.push(payload.id.clone());
                metadata_by_book_id.insert(payload.id.clone(), payload);
            }
            "reading-state" => {
                let payload: SyncSnapshotReadingStatePayload =
                    deserialize_record_payload(record, "reading-state")?;
                if record.id != format!("reading-state:{}", payload.id) {
                    return Err(format!(
                        "Snapshot reading-state record {} does not match payload id {}.",
                        record.id, payload.id
                    ));
                }
                if let Some(scope_book_id) = scope_string(record, "bookId") {
                    if scope_book_id != payload.id {
                        return Err(format!(
                            "Snapshot reading-state record {} has mismatched scope bookId {}.",
                            record.id, scope_book_id
                        ));
                    }
                }
                if let Some(scope_file_path) = scope_string(record, "filePath") {
                    if scope_file_path != payload.file_path {
                        return Err(format!(
                            "Snapshot reading-state record {} has mismatched scope filePath {}.",
                            record.id, scope_file_path
                        ));
                    }
                }
                if reading_state_by_book_id
                    .insert(payload.id.clone(), payload)
                    .is_some()
                {
                    return Err(format!(
                        "Snapshot contains duplicate reading state for book {}.",
                        record.id.trim_start_matches("reading-state:")
                    ));
                }
            }
            "bookmarks" => {
                let payload: SyncSnapshotBookmarksStateRecord =
                    deserialize_record_payload(record, "bookmarks")?;
                let expected_id = build_scoped_record_id("bookmarks", &payload.book_key);
                if record.id != expected_id {
                    return Err(format!(
                        "Snapshot bookmarks record {} does not match book key {}.",
                        record.id, payload.book_key
                    ));
                }
                if let Some(scope_book_key) = scope_string(record, "bookKey") {
                    if scope_book_key != payload.book_key {
                        return Err(format!(
                            "Snapshot bookmarks record {} has mismatched scope bookKey {}.",
                            record.id, scope_book_key
                        ));
                    }
                }
                if !bookmark_keys.insert(payload.book_key.clone()) {
                    return Err(format!(
                        "Snapshot contains duplicate bookmarks state for {}.",
                        payload.book_key
                    ));
                }
                bookmark_records.push(payload);
            }
            "notes" => {
                let payload: SyncSnapshotNotesStateRecord =
                    deserialize_record_payload(record, "notes")?;
                let expected_id = build_scoped_record_id("notes", &payload.book_key);
                if record.id != expected_id {
                    return Err(format!(
                        "Snapshot notes record {} does not match book key {}.",
                        record.id, payload.book_key
                    ));
                }
                if let Some(scope_book_key) = scope_string(record, "bookKey") {
                    if scope_book_key != payload.book_key {
                        return Err(format!(
                            "Snapshot notes record {} has mismatched scope bookKey {}.",
                            record.id, scope_book_key
                        ));
                    }
                }
                if !note_keys.insert(payload.book_key.clone()) {
                    return Err(format!(
                        "Snapshot contains duplicate notes state for {}.",
                        payload.book_key
                    ));
                }
                note_records.push(payload);
            }
            "highlights-workspace" => {
                let payload: SyncSnapshotHighlightsWorkspaceRecord =
                    deserialize_record_payload(record, "highlights-workspace")?;
                let expected_id =
                    build_scoped_record_id("highlights-workspace", &payload.book_key);
                if record.id != expected_id {
                    return Err(format!(
                        "Snapshot highlights-workspace record {} does not match book key {}.",
                        record.id, payload.book_key
                    ));
                }
                if let Some(scope_book_key) = scope_string(record, "bookKey") {
                    if scope_book_key != payload.book_key {
                        return Err(format!(
                            "Snapshot highlights-workspace record {} has mismatched scope bookKey {}.",
                            record.id, scope_book_key
                        ));
                    }
                }
                if !highlights_keys.insert(payload.book_key.clone()) {
                    return Err(format!(
                        "Snapshot contains duplicate highlights workspace for {}.",
                        payload.book_key
                    ));
                }
                highlights_records.push(payload);
            }
            "reader-settings" => {
                let payload: SyncSnapshotReaderSettingsPayload =
                    deserialize_record_payload(record, "reader-settings")?;
                if payload.storage_key != READER_SETTINGS_STORAGE_KEY {
                    return Err(format!(
                        "Snapshot reader-settings record {} targets unsupported storage key {}.",
                        record.id, payload.storage_key
                    ));
                }
                let expected_id = build_scoped_record_id("reader-settings", &payload.storage_key);
                if record.id != expected_id {
                    return Err(format!(
                        "Snapshot reader-settings record {} does not match storage key {}.",
                        record.id, payload.storage_key
                    ));
                }
                if let Some(scope_storage_key) = scope_string(record, "storageKey") {
                    if scope_storage_key != payload.storage_key {
                        return Err(format!(
                            "Snapshot reader-settings record {} has mismatched scope storageKey {}.",
                            record.id, scope_storage_key
                        ));
                    }
                }
                if !payload.settings.is_object() {
                    return Err(format!(
                        "Snapshot reader-settings record {} must contain a settings object.",
                        record.id
                    ));
                }
                if reader_settings.replace(record.clone()).is_some() {
                    return Err("Snapshot contains more than one reader settings record.".to_string());
                }
            }
            other => {
                return Err(format!("Snapshot contains an unsupported record kind: {other}"));
            }
        }
    }

    let library_file_paths = metadata_by_book_id
        .values()
        .map(|payload| payload.file_path.clone())
        .collect::<HashSet<_>>();

    for (book_id, reading_state) in &reading_state_by_book_id {
        let Some(metadata) = metadata_by_book_id.get(book_id) else {
            return Err(format!(
                "Snapshot reading state for {book_id} is missing its library metadata record."
            ));
        };
        if reading_state.file_path != metadata.file_path {
            return Err(format!(
                "Snapshot reading state for {book_id} targets filePath {} instead of {}.",
                reading_state.file_path, metadata.file_path
            ));
        }
    }

    for book_key in bookmark_records
        .iter()
        .map(|record| record.book_key.as_str())
        .chain(note_records.iter().map(|record| record.book_key.as_str()))
        .chain(highlights_records.iter().map(|record| record.book_key.as_str()))
    {
        if !library_file_paths.contains(book_key) {
            return Err(format!(
                "Snapshot state for {} does not match any imported library book.",
                book_key
            ));
        }
    }

    Ok((
        ApplySyncSnapshotRequest {
            library_books: metadata_records
                .into_iter()
                .map(|book_id| {
                    let metadata = metadata_by_book_id
                        .get(&book_id)
                        .expect("metadata id should exist while building apply request");
                    let reading_state = reading_state_by_book_id.get(&book_id);
                    LibraryBookRecord {
                        id: metadata.id.clone(),
                        title: metadata.title.clone(),
                        author: metadata.author.clone(),
                        format: metadata.format.clone(),
                        description: metadata.description.clone(),
                        language: metadata.language.clone(),
                        publisher: metadata.publisher.clone(),
                        collection: metadata.collection.clone(),
                        tags: metadata.tags.clone(),
                        progress: reading_state
                            .map(|state| state.progress.clone())
                            .unwrap_or_else(|| "尚未开始".to_string()),
                        status: reading_state
                            .map(|state| state.status.clone())
                            .unwrap_or_else(|| "未开始".to_string()),
                        file_path: metadata.file_path.clone(),
                        cover_path: metadata.cover_path.clone(),
                        source_path: metadata.source_path.clone(),
                        imported_at: metadata.imported_at,
                        progress_fraction: reading_state.and_then(|state| state.progress_fraction),
                        progress_location: reading_state
                            .and_then(|state| state.progress_location.clone()),
                        koreader_progress_location: reading_state
                            .and_then(|state| state.koreader_progress_location.clone()),
                        last_opened_at: reading_state.and_then(|state| state.last_opened_at),
                        library_file_exists: metadata.library_file_exists,
                        source_file_exists: metadata.source_file_exists,
                    }
                })
                .collect(),
            bookmarks: bookmark_records,
            notes: note_records,
            highlights_workspace: highlights_records,
            reader_settings: reader_settings.clone(),
        },
        reader_settings,
    ))
}

fn validate_koreader_sync_exchange(document: &serde_json::Value) -> Result<usize, String> {
    let parsed: KoReaderExchangeDocumentPayload = serde_json::from_value(document.clone())
        .map_err(|error| format!("KOReader exchange document is not valid JSON: {error}"))?;
    if parsed.schema_version != KOREADER_SYNC_EXCHANGE_SCHEMA_VERSION {
        return Err(format!(
            "Unsupported KOReader exchange schema version: {}",
            parsed.schema_version
        ));
    }

    for (index, book) in parsed.books.iter().enumerate() {
        if book.title.trim().is_empty() || book.author.trim().is_empty() || book.format.trim().is_empty() {
            return Err(format!(
                "KOReader exchange book {} is missing title, author, or format.",
                index + 1
            ));
        }
        if book.koreader.config.xpointer.trim().is_empty() {
            return Err(format!(
                "KOReader exchange book {} is missing a KOReader xpointer.",
                index + 1
            ));
        }
    }

    Ok(parsed.books.len())
}

fn parse_koreader_exchange_document(raw: &str) -> Result<KoReaderExchangeDocumentPayload, String> {
    let document: serde_json::Value = serde_json::from_str(raw)
        .map_err(|error| format!("Exchange file is not valid JSON: {error}"))?;
    validate_koreader_sync_exchange(&document)?;
    serde_json::from_value(document)
        .map_err(|error| format!("KOReader exchange document is not valid JSON: {error}"))
}

fn has_koreader_identity(
    book_hash: Option<&String>,
    meta_hash: Option<&String>,
) -> bool {
    matches!((book_hash, meta_hash), (Some(book_hash), Some(meta_hash)) if !book_hash.is_empty() && !meta_hash.is_empty())
}

fn matches_imported_koreader_bookmark(
    existing: &ReaderBookmarkRecord,
    imported: &ReaderBookmarkRecord,
) -> bool {
    let Some(existing_metadata) = existing.koreader.as_ref() else {
        return false;
    };
    let Some(imported_metadata) = imported.koreader.as_ref() else {
        return false;
    };
    if existing.id == imported.id {
        return true;
    }

    let existing_annotation = &existing_metadata.annotation;
    let imported_annotation = &imported_metadata.annotation;
    has_koreader_identity(
        existing_annotation.book_hash.as_ref(),
        existing_annotation.meta_hash.as_ref(),
    ) && has_koreader_identity(
        imported_annotation.book_hash.as_ref(),
        imported_annotation.meta_hash.as_ref(),
    ) && existing_annotation.book_hash == imported_annotation.book_hash
        && existing_annotation.meta_hash == imported_annotation.meta_hash
        && existing_annotation
            .xpointer0
            .eq(imported_annotation.xpointer0.as_str())
}

fn matches_imported_koreader_note(existing: &ReaderNoteRecord, imported: &ReaderNoteRecord) -> bool {
    let Some(existing_metadata) = existing.koreader.as_ref() else {
        return false;
    };
    let Some(imported_metadata) = imported.koreader.as_ref() else {
        return false;
    };
    if existing.id == imported.id {
        return true;
    }

    has_koreader_identity(
        existing_metadata.book_hash.as_ref(),
        existing_metadata.meta_hash.as_ref(),
    ) && has_koreader_identity(
        imported_metadata.book_hash.as_ref(),
        imported_metadata.meta_hash.as_ref(),
    ) && existing_metadata.book_hash == imported_metadata.book_hash
        && existing_metadata.meta_hash == imported_metadata.meta_hash
        && existing_metadata.xpointer0.eq(imported_metadata.xpointer0.as_str())
}

fn imported_annotation_to_bookmark(
    annotation: &KoReaderExchangeAnnotationPayload,
) -> Option<ReaderBookmarkRecord> {
    if annotation.deleted_at.is_some() || annotation.kind != "bookmark" {
        return None;
    }

    Some(ReaderBookmarkRecord {
        id: annotation.id.clone(),
        locator: annotation.xpointer0.clone(),
        target_href: annotation.xpointer0.clone(),
        chapter_label: if annotation.text.trim().is_empty() {
            "KOReader bookmark".to_string()
        } else {
            annotation.text.clone()
        },
        chapter_href: annotation.xpointer0.clone(),
        progress_label: annotation
            .page
            .map(|page| format!("Page {page}"))
            .unwrap_or_default(),
        location_label: annotation.xpointer0.clone(),
        created_at: annotation.created_at,
        koreader: Some(ReaderBookmarkKoReaderMetadataRecord {
            annotation: crate::models::ReaderAnnotationKoReaderMetadataRecord {
                book_hash: Some(annotation.identity.book_hash.clone()),
                meta_hash: Some(annotation.identity.meta_hash.clone()),
                xpointer0: annotation.xpointer0.clone(),
                xpointer1: None,
                page: annotation.page,
                style: None,
                color: None,
                updated_at: Some(annotation.updated_at),
                deleted_at: annotation.deleted_at,
            },
            text: Some(annotation.text.clone()),
            note: Some(annotation.note.clone()),
        }),
    })
}

fn imported_annotation_to_note(annotation: &KoReaderExchangeAnnotationPayload) -> Option<ReaderNoteRecord> {
    if annotation.deleted_at.is_some() || annotation.kind != "annotation" {
        return None;
    }

    Some(ReaderNoteRecord {
        id: annotation.id.clone(),
        kind: if annotation.note.trim().is_empty() {
            "highlight".to_string()
        } else {
            "note".to_string()
        },
        cfi: annotation.xpointer0.clone(),
        text: annotation.text.clone(),
        note: annotation.note.clone(),
        chapter_label: if annotation.text.trim().is_empty() {
            "KOReader annotation".to_string()
        } else {
            annotation.text.clone()
        },
        chapter_href: String::new(),
        created_at: annotation.created_at,
        koreader: Some(crate::models::ReaderAnnotationKoReaderMetadataRecord {
            book_hash: Some(annotation.identity.book_hash.clone()),
            meta_hash: Some(annotation.identity.meta_hash.clone()),
            xpointer0: annotation.xpointer0.clone(),
            xpointer1: annotation.xpointer1.clone(),
            page: annotation.page,
            style: annotation.style.clone(),
            color: annotation.color.clone(),
            updated_at: Some(annotation.updated_at),
            deleted_at: annotation.deleted_at,
        }),
    })
}

fn merge_imported_bookmarks(
    current_bookmarks: &[ReaderBookmarkRecord],
    imported_bookmarks: &[ReaderBookmarkRecord],
) -> Vec<ReaderBookmarkRecord> {
    let mut merged = current_bookmarks
        .iter()
        .filter(|bookmark| {
            let metadata = bookmark.koreader.as_ref().map(|entry| &entry.annotation);
            !has_koreader_identity(
                metadata.and_then(|entry| entry.book_hash.as_ref()),
                metadata.and_then(|entry| entry.meta_hash.as_ref()),
            ) && !imported_bookmarks
                .iter()
                .any(|imported| matches_imported_koreader_bookmark(bookmark, imported))
        })
        .cloned()
        .collect::<Vec<_>>();

    merged.extend(imported_bookmarks.iter().map(|bookmark| {
        let existing = current_bookmarks
            .iter()
            .find(|candidate| matches_imported_koreader_bookmark(candidate, bookmark));
        ReaderBookmarkRecord {
            id: bookmark.id.clone(),
            locator: existing
                .map(|entry| entry.locator.clone())
                .unwrap_or_else(|| bookmark.locator.clone()),
            target_href: existing
                .filter(|entry| !entry.target_href.is_empty())
                .map(|entry| entry.target_href.clone())
                .unwrap_or_else(|| {
                    if !bookmark.target_href.is_empty() {
                        bookmark.target_href.clone()
                    } else {
                        bookmark.locator.clone()
                    }
                }),
            chapter_label: if !bookmark.chapter_label.is_empty() {
                bookmark.chapter_label.clone()
            } else {
                existing
                    .map(|entry| entry.chapter_label.clone())
                    .unwrap_or_else(|| "KOReader bookmark".to_string())
            },
            chapter_href: existing
                .filter(|entry| !entry.chapter_href.is_empty())
                .map(|entry| entry.chapter_href.clone())
                .unwrap_or_else(|| {
                    if !bookmark.chapter_href.is_empty() {
                        bookmark.chapter_href.clone()
                    } else if let Some(existing) = existing {
                        if !existing.target_href.is_empty() {
                            existing.target_href.clone()
                        } else if !bookmark.target_href.is_empty() {
                            bookmark.target_href.clone()
                        } else {
                            bookmark.locator.clone()
                        }
                    } else if !bookmark.target_href.is_empty() {
                        bookmark.target_href.clone()
                    } else {
                        bookmark.locator.clone()
                    }
                }),
            progress_label: if !bookmark.progress_label.is_empty() {
                bookmark.progress_label.clone()
            } else {
                existing
                    .map(|entry| entry.progress_label.clone())
                    .unwrap_or_default()
            },
            location_label: existing
                .filter(|entry| !entry.location_label.is_empty())
                .map(|entry| entry.location_label.clone())
                .unwrap_or_else(|| {
                    if !bookmark.location_label.is_empty() {
                        bookmark.location_label.clone()
                    } else {
                        bookmark.locator.clone()
                    }
                }),
            created_at: bookmark.created_at,
            koreader: bookmark.koreader.clone(),
        }
    }));

    merged
}

fn merge_imported_notes(
    current_notes: &[ReaderNoteRecord],
    imported_notes: &[ReaderNoteRecord],
) -> Vec<ReaderNoteRecord> {
    let mut merged = current_notes
        .iter()
        .filter(|note| {
            let metadata = note.koreader.as_ref();
            !has_koreader_identity(
                metadata.and_then(|entry| entry.book_hash.as_ref()),
                metadata.and_then(|entry| entry.meta_hash.as_ref()),
            ) && !imported_notes
                .iter()
                .any(|imported| matches_imported_koreader_note(note, imported))
        })
        .cloned()
        .collect::<Vec<_>>();

    merged.extend(imported_notes.iter().map(|note| {
        let existing = current_notes
            .iter()
            .find(|candidate| matches_imported_koreader_note(candidate, note));
        ReaderNoteRecord {
            id: note.id.clone(),
            kind: note.kind.clone(),
            cfi: existing
                .map(|entry| entry.cfi.clone())
                .unwrap_or_else(|| note.cfi.clone()),
            text: note.text.clone(),
            note: note.note.clone(),
            chapter_label: if !note.chapter_label.is_empty() {
                note.chapter_label.clone()
            } else {
                existing
                    .map(|entry| entry.chapter_label.clone())
                    .unwrap_or_else(|| "KOReader annotation".to_string())
            },
            chapter_href: existing
                .filter(|entry| !entry.chapter_href.is_empty())
                .map(|entry| entry.chapter_href.clone())
                .unwrap_or_else(|| note.chapter_href.clone()),
            created_at: note.created_at,
            koreader: note.koreader.clone(),
        }
    }));

    merged
}

fn imported_book_updated_at(book: &KoReaderExchangeBookPayload) -> u64 {
    book.koreader
        .annotations
        .iter()
        .map(|annotation| annotation.updated_at)
        .chain(std::iter::once(book.koreader.config.updated_at))
        .max()
        .unwrap_or(book.koreader.config.updated_at)
}

fn current_book_updated_at(
    current_book: &LibraryBookRecord,
    current_bookmarks: &[ReaderBookmarkRecord],
    current_notes: &[ReaderNoteRecord],
) -> u64 {
    current_bookmarks
        .iter()
        .map(|bookmark| bookmark.created_at)
        .chain(current_notes.iter().map(|note| note.created_at))
        .chain(std::iter::once(
            current_book
                .last_opened_at
                .unwrap_or(current_book.imported_at),
        ))
        .max()
        .unwrap_or(current_book.imported_at)
}

fn reading_state_payload_json(book: &LibraryBookRecord) -> serde_json::Value {
    serde_json::json!({
        "progress": book.progress,
        "status": book.status,
        "progressFraction": book.progress_fraction,
        "progressLocation": book.progress_location,
        "koreaderProgressLocation": book.koreader_progress_location,
        "lastOpenedAt": book.last_opened_at,
    })
}

fn resolve_matched_library_book<'a>(
    exchange_book: &KoReaderExchangeBookPayload,
    records: &'a [LibraryBookRecord],
) -> Result<&'a LibraryBookRecord, KoReaderExchangeConflict> {
    if let Some(record) = records.iter().find(|record| record.id == exchange_book.book_id) {
        return Ok(record);
    }
    if let Some(record) = records
        .iter()
        .find(|record| record.file_path == exchange_book.file_path)
    {
        return Ok(record);
    }
    if let Some(source_path) = exchange_book.source_path.as_ref() {
        if let Some(record) = records
            .iter()
            .find(|record| record.source_path.as_ref() == Some(source_path))
        {
            return Ok(record);
        }
    }

    let fallback_matches = records
        .iter()
        .filter(|record| {
            record.title == exchange_book.title
                && record.author == exchange_book.author
                && record.format == exchange_book.format
        })
        .collect::<Vec<_>>();
    if fallback_matches.len() == 1 {
        return Ok(fallback_matches[0]);
    }
    if fallback_matches.len() > 1 {
        return Err(KoReaderExchangeConflict {
            kind: "ambiguous-local-book".to_string(),
            book_title: exchange_book.title.clone(),
            book_author: exchange_book.author.clone(),
            book_format: exchange_book.format.clone(),
            detail: format!(
                "找到 {} 本同名同作者同格式图书，无法安全决定要覆盖哪一本。",
                fallback_matches.len()
            ),
        });
    }

    Err(KoReaderExchangeConflict {
        kind: "missing-local-book".to_string(),
        book_title: exchange_book.title.clone(),
        book_author: exchange_book.author.clone(),
        book_format: exchange_book.format.clone(),
        detail: "当前书库中找不到可唯一匹配的图书记录。".to_string(),
    })
}

fn apply_koreader_sync_exchange_document(
    app: &tauri::AppHandle,
    document: &KoReaderExchangeDocumentPayload,
) -> Result<ApplyKoReaderSyncExchangeResult, String> {
    ensure_library_root(app)?;
    let library_json = library_json_path(app)?;
    let mut library_books = load_library_records(&library_json)?;
    let book_index_by_id = library_books
        .iter()
        .enumerate()
        .map(|(index, book)| (book.id.clone(), index))
        .collect::<HashMap<_, _>>();
    let mut applied_book_count = 0usize;
    let mut conflicts = Vec::new();

    for exchange_book in &document.books {
        let matched = match resolve_matched_library_book(exchange_book, &library_books) {
            Ok(record) => record.clone(),
            Err(conflict) => {
                conflicts.push(conflict);
                continue;
            }
        };

        let current_bookmarks =
            crate::commands::bookmarks::load_reader_bookmarks(app.clone(), matched.file_path.clone())?;
        let current_notes =
            crate::commands::notes::load_reader_notes(app.clone(), matched.file_path.clone())?;
        let imported_book = LibraryBookRecord {
            progress: match &exchange_book.koreader.config.progress {
                serde_json::Value::String(value) if !value.trim().is_empty() => value.trim().to_string(),
                serde_json::Value::Array(values) if values.len() == 2 => {
                    let current = values.first().and_then(|value| value.as_u64()).unwrap_or(0);
                    let total = values.get(1).and_then(|value| value.as_u64()).unwrap_or(0);
                    if total > 0 {
                        format!("[{current},{total}]")
                    } else {
                        matched.progress.clone()
                    }
                }
                _ => matched.progress.clone(),
            },
            progress_fraction: match &exchange_book.koreader.config.progress {
                serde_json::Value::Array(values) if values.len() == 2 => {
                    let current = values.first().and_then(|value| value.as_f64()).unwrap_or(0.0);
                    let total = values.get(1).and_then(|value| value.as_f64()).unwrap_or(0.0);
                    if total > 0.0 { Some(current / total) } else { matched.progress_fraction }
                }
                _ => matched.progress_fraction,
            },
            koreader_progress_location: Some(exchange_book.koreader.config.xpointer.trim().to_string()),
            last_opened_at: Some(exchange_book.koreader.config.updated_at),
            ..matched.clone()
        };
        let imported_bookmarks = exchange_book
            .koreader
            .annotations
            .iter()
            .filter_map(imported_annotation_to_bookmark)
            .collect::<Vec<_>>();
        let imported_notes = exchange_book
            .koreader
            .annotations
            .iter()
            .filter_map(imported_annotation_to_note)
            .collect::<Vec<_>>();
        let merged_bookmarks = merge_imported_bookmarks(&current_bookmarks, &imported_bookmarks);
        let merged_notes = merge_imported_notes(&current_notes, &imported_notes);
        let payload_differs =
            reading_state_payload_json(&matched) != reading_state_payload_json(&imported_book)
                || serde_json::to_value(&current_bookmarks).map_err(|error| error.to_string())?
                    != serde_json::to_value(&merged_bookmarks).map_err(|error| error.to_string())?
                || serde_json::to_value(&current_notes).map_err(|error| error.to_string())?
                    != serde_json::to_value(&merged_notes).map_err(|error| error.to_string())?;

        if payload_differs
            && current_book_updated_at(&matched, &current_bookmarks, &current_notes)
                > imported_book_updated_at(exchange_book)
        {
            conflicts.push(KoReaderExchangeConflict {
                kind: "local-newer".to_string(),
                book_title: matched.title.clone(),
                book_author: matched.author.clone(),
                book_format: matched.format.clone(),
                detail: "当前本地阅读状态比导入文件更新，已跳过以避免覆盖较新的本地记录。".to_string(),
            });
            continue;
        }

        if let Some(index) = book_index_by_id.get(&matched.id).copied() {
            library_books[index] = imported_book;
        }
        crate::commands::bookmarks::save_reader_bookmarks(
            app.clone(),
            matched.file_path.clone(),
            merged_bookmarks,
        )?;
        crate::commands::notes::save_reader_notes(app.clone(), matched.file_path.clone(), merged_notes)?;
        applied_book_count += 1;
    }

    save_library_records(&library_json, &library_books)?;

    Ok(ApplyKoReaderSyncExchangeResult {
        applied_book_count,
        skipped_book_count: document.books.len().saturating_sub(applied_book_count),
        conflicts: conflicts
            .into_iter()
            .map(|conflict| KoReaderSyncConflictResult {
                kind: conflict.kind,
                book_title: conflict.book_title,
                book_author: conflict.book_author,
                book_format: conflict.book_format,
                detail: conflict.detail,
            })
            .collect(),
    })
}

fn write_sync_snapshot_document(path: &Path, snapshot: &SyncSnapshotDocument) -> Result<(), String> {
    validate_sync_snapshot(snapshot)?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let raw = serde_json::to_string_pretty(snapshot).map_err(|error| error.to_string())?;
    fs::write(path, raw).map_err(|error| error.to_string())
}

fn write_json_document(path: &Path, document: &serde_json::Value) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let raw = serde_json::to_string_pretty(document).map_err(|error| error.to_string())?;
    fs::write(path, raw).map_err(|error| error.to_string())
}

fn clear_json_files_in_directory(root: &Path) -> Result<(), String> {
    fs::create_dir_all(root).map_err(|error| error.to_string())?;
    for entry in fs::read_dir(root).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        if path.extension().and_then(|value| value.to_str()) != Some("json") {
            continue;
        }
        fs::remove_file(path).map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn apply_sync_snapshot_roots(
    library_json: &Path,
    bookmarks_root: &Path,
    notes_root: &Path,
    highlights_root: &Path,
    request: &ApplySyncSnapshotRequest,
) -> Result<ApplySyncSnapshotResult, String> {
    if let Some(parent) = library_json.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    save_library_records(library_json, &request.library_books)?;

    clear_json_files_in_directory(bookmarks_root)?;
    for record in &request.bookmarks {
        let path = bookmarks_root.join(format!("{}.json", reader_storage_component_key(&record.book_key)));
        let entry = ReaderBookmarksEntry {
            schema_version: READER_BOOKMARKS_SCHEMA_VERSION,
            bookmarks: record.bookmarks.clone(),
        };
        let raw = serde_json::to_string_pretty(&entry).map_err(|error| error.to_string())?;
        fs::write(path, raw).map_err(|error| error.to_string())?;
    }

    clear_json_files_in_directory(notes_root)?;
    for record in &request.notes {
        let path = notes_root.join(format!("{}.json", reader_storage_component_key(&record.book_key)));
        let entry = ReaderNotesEntry {
            schema_version: READER_NOTES_SCHEMA_VERSION,
            notes: record.notes.clone(),
        };
        let raw = serde_json::to_string_pretty(&entry).map_err(|error| error.to_string())?;
        fs::write(path, raw).map_err(|error| error.to_string())?;
    }

    clear_json_files_in_directory(highlights_root)?;
    for record in &request.highlights_workspace {
        let path = highlights_root.join(format!("{}.json", reader_storage_component_key(&record.book_key)));
        let entry = ReaderHighlightsWorkspaceEntry {
            schema_version: READER_HIGHLIGHTS_WORKSPACE_SCHEMA_VERSION,
            state: record.state.clone(),
        };
        let raw = serde_json::to_string_pretty(&entry).map_err(|error| error.to_string())?;
        fs::write(path, raw).map_err(|error| error.to_string())?;
    }

    Ok(ApplySyncSnapshotResult {
        library_book_count: request.library_books.len(),
        bookmark_book_count: request.bookmarks.len(),
        note_book_count: request.notes.len(),
        highlights_workspace_book_count: request.highlights_workspace.len(),
        restored_reader_settings: request.reader_settings.is_some(),
    })
}

fn hash_sync_key(value: &str) -> String {
    let mut hash = 0x811c9dc5u32;
    for byte in value.bytes() {
        hash ^= byte as u32;
        hash = hash.wrapping_mul(0x01000193);
    }
    format!("{hash:08x}")
}

fn build_scoped_record_id(kind: &str, scope: &str) -> String {
    format!("{kind}:{}", hash_sync_key(scope))
}

fn resolve_updated_at(values: &[Option<u64>], fallback_updated_at: u64) -> u64 {
    values
        .iter()
        .flatten()
        .copied()
        .max()
        .unwrap_or(fallback_updated_at)
}

fn library_metadata_sync_record(book: &LibraryBookRecord, exported_at: u64) -> SyncSnapshotRecord {
    SyncSnapshotRecord {
        schema_version: BR1_SYNC_SNAPSHOT_SCHEMA_VERSION,
        kind: "library-book".to_string(),
        id: format!("library-book:{}", book.id),
        updated_at: resolve_updated_at(&[Some(book.imported_at)], exported_at),
        scope: Some(serde_json::json!({ "bookId": book.id })),
        payload: serde_json::json!({
            "id": book.id,
            "title": book.title,
            "author": book.author,
            "format": book.format,
            "description": book.description,
            "language": book.language,
            "publisher": book.publisher,
            "collection": book.collection,
            "tags": book.tags,
            "filePath": book.file_path,
            "coverPath": book.cover_path,
            "sourcePath": book.source_path,
            "importedAt": book.imported_at,
            "libraryFileExists": book.library_file_exists,
            "sourceFileExists": book.source_file_exists,
        }),
    }
}

fn reading_state_sync_record(book: &LibraryBookRecord, exported_at: u64) -> SyncSnapshotRecord {
    SyncSnapshotRecord {
        schema_version: BR1_SYNC_SNAPSHOT_SCHEMA_VERSION,
        kind: "reading-state".to_string(),
        id: format!("reading-state:{}", book.id),
        updated_at: resolve_updated_at(&[book.last_opened_at, Some(book.imported_at)], exported_at),
        scope: Some(serde_json::json!({
            "bookId": book.id,
            "filePath": book.file_path,
        })),
        payload: serde_json::json!({
            "id": book.id,
            "filePath": book.file_path,
            "progress": book.progress,
            "status": book.status,
            "progressFraction": book.progress_fraction,
            "progressLocation": book.progress_location,
            "koreaderProgressLocation": book.koreader_progress_location,
            "lastOpenedAt": book.last_opened_at,
        }),
    }
}

fn bookmarks_sync_record(
    book_key: &str,
    bookmarks: Vec<ReaderBookmarkRecord>,
    exported_at: u64,
) -> SyncSnapshotRecord {
    let updated_at = resolve_updated_at(
        &bookmarks
            .iter()
            .map(|bookmark| Some(bookmark.created_at))
            .collect::<Vec<_>>(),
        exported_at,
    );
    SyncSnapshotRecord {
        schema_version: BR1_SYNC_SNAPSHOT_SCHEMA_VERSION,
        kind: "bookmarks".to_string(),
        id: build_scoped_record_id("bookmarks", book_key),
        updated_at,
        scope: Some(serde_json::json!({ "bookKey": book_key })),
        payload: serde_json::json!({
            "bookKey": book_key,
            "bookmarks": bookmarks,
        }),
    }
}

fn notes_sync_record(
    book_key: &str,
    notes: Vec<ReaderNoteRecord>,
    exported_at: u64,
) -> SyncSnapshotRecord {
    let updated_at = resolve_updated_at(
        &notes
            .iter()
            .map(|note| Some(note.created_at))
            .collect::<Vec<_>>(),
        exported_at,
    );
    SyncSnapshotRecord {
        schema_version: BR1_SYNC_SNAPSHOT_SCHEMA_VERSION,
        kind: "notes".to_string(),
        id: build_scoped_record_id("notes", book_key),
        updated_at,
        scope: Some(serde_json::json!({ "bookKey": book_key })),
        payload: serde_json::json!({
            "bookKey": book_key,
            "notes": notes,
        }),
    }
}

fn highlights_sync_record(
    book_key: &str,
    state: ReaderHighlightsWorkspaceStateRecord,
    exported_at: u64,
) -> SyncSnapshotRecord {
    let mut updated_values = Vec::new();
    for selection in &state.saved_selections {
        updated_values.push(Some(selection.created_at));
        updated_values.push(selection.import_source.as_ref().map(|source| source.imported_at));
    }

    SyncSnapshotRecord {
        schema_version: BR1_SYNC_SNAPSHOT_SCHEMA_VERSION,
        kind: "highlights-workspace".to_string(),
        id: build_scoped_record_id("highlights-workspace", book_key),
        updated_at: resolve_updated_at(&updated_values, exported_at),
        scope: Some(serde_json::json!({ "bookKey": book_key })),
        payload: serde_json::json!({
            "bookKey": book_key,
            "state": state,
        }),
    }
}

pub(crate) fn load_current_sync_snapshot(
    app: &tauri::AppHandle,
) -> Result<SyncSnapshotDocument, String> {
    ensure_library_root(app)?;
    let exported_at = now_millis()?;
    let library_json = library_json_path(app)?;
    let library_books = load_library_records(&library_json)?;
    let mut records = Vec::new();

    for book in &library_books {
        records.push(library_metadata_sync_record(book, exported_at));
        records.push(reading_state_sync_record(book, exported_at));

        let book_key = book.file_path.clone();
        let bookmarks =
            crate::commands::bookmarks::load_reader_bookmarks(app.clone(), book_key.clone())?;
        records.push(bookmarks_sync_record(&book_key, bookmarks, exported_at));

        let notes = crate::commands::notes::load_reader_notes(app.clone(), book_key.clone())?;
        records.push(notes_sync_record(&book_key, notes, exported_at));

        if let Some(state) = crate::commands::highlights_workspace::load_reader_highlights_workspace_state(
            app.clone(),
            book_key.clone(),
        )? {
            records.push(highlights_sync_record(&book_key, state, exported_at));
        }
    }

    Ok(SyncSnapshotDocument {
        schema_version: BR1_SYNC_SNAPSHOT_SCHEMA_VERSION,
        exported_at,
        records,
    })
}

fn prepare_sync_snapshot_restore(
    snapshot: &SyncSnapshotDocument,
) -> Result<(ApplySyncSnapshotRequest, Option<SyncSnapshotRecord>), String> {
    prepare_apply_sync_snapshot_request(snapshot)
}

pub(crate) fn apply_sync_snapshot_document(
    app: &tauri::AppHandle,
    snapshot: &SyncSnapshotDocument,
) -> Result<(ApplySyncSnapshotResult, Option<SyncSnapshotRecord>), String> {
    validate_sync_snapshot(snapshot)?;
    ensure_library_root(app)?;
    let library_json = library_json_path(app)?;
    let bookmarks_root = reader_bookmarks_root(app)?;
    let notes_root = reader_notes_root(app)?;
    let highlights_root = reader_highlights_workspace_root(app)?;
    let (request, reader_settings_record) = prepare_sync_snapshot_restore(snapshot)?;
    let apply_result = apply_sync_snapshot_roots(
        &library_json,
        &bookmarks_root,
        &notes_root,
        &highlights_root,
        &request,
    )?;
    Ok((apply_result, reader_settings_record))
}

#[tauri::command]
pub(crate) async fn save_sync_snapshot_dialog(
    app: tauri::AppHandle,
    snapshot: SyncSnapshotDocument,
) -> Result<SyncSnapshotExportDialogResult, String> {
    validate_sync_snapshot(&snapshot)?;
    let snapshots_root = sync_snapshots_root(&app)?;
    let default_file_name = sync_snapshot_file_name(snapshot.exported_at.max(now_millis()?));
    let picker_app = app.clone();
    let selected = tauri::async_runtime::spawn_blocking(move || {
        picker_app
            .dialog()
            .file()
            .add_filter("br1 Sync Snapshot", SYNC_SNAPSHOT_DIALOG_EXTENSIONS)
            .set_directory(&snapshots_root)
            .set_file_name(default_file_name)
            .blocking_save_file()
    })
    .await
    .map_err(|error| error.to_string())?;

    let Some(selected) = selected else {
        return Ok(SyncSnapshotExportDialogResult {
            cancelled: true,
            file_name: None,
            record_count: snapshot.records.len(),
        });
    };

    let path = resolve_dialog_file_path(selected)?;
    write_sync_snapshot_document(&path, &snapshot)?;
    Ok(SyncSnapshotExportDialogResult {
        cancelled: false,
        file_name: path.file_name().and_then(|value| value.to_str()).map(str::to_string),
        record_count: snapshot.records.len(),
    })
}

#[tauri::command]
pub(crate) async fn load_sync_snapshot_dialog(
    app: tauri::AppHandle,
) -> Result<SyncSnapshotImportDialogResult, String> {
    let snapshots_root = sync_snapshots_root(&app)?;
    let picker_app = app.clone();
    let selected = tauri::async_runtime::spawn_blocking(move || {
        picker_app
            .dialog()
            .file()
            .add_filter("br1 Sync Snapshot", SYNC_SNAPSHOT_DIALOG_EXTENSIONS)
            .set_directory(&snapshots_root)
            .blocking_pick_file()
    })
    .await
    .map_err(|error| error.to_string())?;

    let Some(selected) = selected else {
        return Ok(SyncSnapshotImportDialogResult {
            cancelled: true,
            file_name: None,
            record_count: 0,
            snapshot: None,
        });
    };

    let path = resolve_dialog_file_path(selected)?;
    let raw = fs::read_to_string(&path).map_err(|error| error.to_string())?;
    let snapshot = parse_sync_snapshot_document(&raw)?;
    Ok(SyncSnapshotImportDialogResult {
        cancelled: false,
        file_name: path.file_name().and_then(|value| value.to_str()).map(str::to_string),
        record_count: snapshot.records.len(),
        snapshot: Some(snapshot),
    })
}

#[tauri::command]
pub(crate) async fn restore_sync_snapshot_dialog(
    app: tauri::AppHandle,
) -> Result<RestoreSyncSnapshotDialogResult, String> {
    let imported = load_sync_snapshot_dialog(app.clone()).await?;
    if imported.cancelled {
        return Ok(RestoreSyncSnapshotDialogResult {
            cancelled: true,
            file_name: None,
            record_count: 0,
            apply_result: None,
            reader_settings_record: None,
        });
    }

    let Some(snapshot) = imported.snapshot else {
        return Err("Snapshot import did not return a parsed document.".to_string());
    };
    let (apply_result, reader_settings_record) = apply_sync_snapshot_document(&app, &snapshot)?;
    Ok(RestoreSyncSnapshotDialogResult {
        cancelled: false,
        file_name: imported.file_name,
        record_count: imported.record_count,
        apply_result: Some(apply_result),
        reader_settings_record,
    })
}

#[tauri::command]
pub(crate) async fn save_koreader_sync_exchange_dialog(
    app: tauri::AppHandle,
    document: serde_json::Value,
) -> Result<KoReaderSyncExchangeExportDialogResult, String> {
    let book_count = validate_koreader_sync_exchange(&document)?;
    let snapshots_root = sync_snapshots_root(&app)?;
    let exported_at = document
        .get("exportedAt")
        .and_then(|value| value.as_u64())
        .unwrap_or_else(|| now_millis().unwrap_or_default());
    let default_file_name = koreader_sync_exchange_file_name(exported_at.max(now_millis()?));
    let picker_app = app.clone();
    let selected = tauri::async_runtime::spawn_blocking(move || {
        picker_app
            .dialog()
            .file()
            .add_filter("br1 KOReader Exchange", SYNC_SNAPSHOT_DIALOG_EXTENSIONS)
            .set_directory(&snapshots_root)
            .set_file_name(default_file_name)
            .blocking_save_file()
    })
    .await
    .map_err(|error| error.to_string())?;

    let Some(selected) = selected else {
        return Ok(KoReaderSyncExchangeExportDialogResult {
            cancelled: true,
            file_name: None,
            book_count,
        });
    };

    let path = resolve_dialog_file_path(selected)?;
    write_json_document(&path, &document)?;
    Ok(KoReaderSyncExchangeExportDialogResult {
        cancelled: false,
        file_name: path.file_name().and_then(|value| value.to_str()).map(str::to_string),
        book_count,
    })
}

#[tauri::command]
pub(crate) async fn restore_koreader_sync_exchange_dialog(
    app: tauri::AppHandle,
) -> Result<RestoreKoReaderSyncExchangeDialogResult, String> {
    let snapshots_root = sync_snapshots_root(&app)?;
    let picker_app = app.clone();
    let selected = tauri::async_runtime::spawn_blocking(move || {
        picker_app
            .dialog()
            .file()
            .add_filter("br1 KOReader Exchange", SYNC_SNAPSHOT_DIALOG_EXTENSIONS)
            .set_directory(&snapshots_root)
            .blocking_pick_file()
    })
    .await
    .map_err(|error| error.to_string())?;

    let Some(selected) = selected else {
        return Ok(RestoreKoReaderSyncExchangeDialogResult {
            cancelled: true,
            file_name: None,
            book_count: 0,
            apply_result: None,
        });
    };

    let path = resolve_dialog_file_path(selected)?;
    let raw = fs::read_to_string(&path).map_err(|error| error.to_string())?;
    let document = parse_koreader_exchange_document(&raw)?;
    let apply_result = apply_koreader_sync_exchange_document(&app, &document)?;
    Ok(RestoreKoReaderSyncExchangeDialogResult {
        cancelled: false,
        file_name: path.file_name().and_then(|value| value.to_str()).map(str::to_string),
        book_count: document.books.len(),
        apply_result: Some(apply_result),
    })
}

#[cfg(test)]
mod tests {
    use super::{
        apply_sync_snapshot_roots, bookmarks_sync_record, build_scoped_record_id,
        highlights_sync_record, library_metadata_sync_record, notes_sync_record,
        parse_sync_snapshot_document, prepare_sync_snapshot_restore, reading_state_sync_record,
        write_sync_snapshot_document, READER_SETTINGS_STORAGE_KEY,
    };
    use crate::models::{
        ApplySyncSnapshotRequest, LibraryBookRecord, ReaderBookmarkRecord,
        ReaderHighlightsSelectionImportRecord, ReaderHighlightsSelectionSetRecord,
        ReaderHighlightsWorkspaceStateRecord, ReaderNoteRecord, SyncSnapshotBookmarksStateRecord,
        SyncSnapshotDocument, SyncSnapshotHighlightsWorkspaceRecord, SyncSnapshotNotesStateRecord,
        SyncSnapshotRecord, BR1_SYNC_SNAPSHOT_SCHEMA_VERSION,
    };
    use std::fs;
    use std::path::PathBuf;

    fn temp_root(name: &str) -> PathBuf {
        let mut root = std::env::temp_dir();
        root.push("br1-sync-snapshot-tests");
        root.push(format!(
            "{name}-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        root
    }

    #[test]
    fn snapshot_document_round_trips_and_rejects_duplicate_record_ids() {
        let document = SyncSnapshotDocument {
            schema_version: BR1_SYNC_SNAPSHOT_SCHEMA_VERSION,
            exported_at: 10,
            records: vec![SyncSnapshotRecord {
                schema_version: BR1_SYNC_SNAPSHOT_SCHEMA_VERSION,
                kind: "reader-settings".to_string(),
                id: "reader-settings:1".to_string(),
                updated_at: 10,
                scope: None,
                payload: serde_json::json!({
                    "storageKey": "br1.reader.settings",
                    "settings": { "flowMode": "paginated" }
                }),
            }],
        };

        let path = temp_root("write").join("snapshot.json");
        write_sync_snapshot_document(&path, &document).unwrap();
        let parsed = parse_sync_snapshot_document(&fs::read_to_string(path).unwrap()).unwrap();
        assert_eq!(parsed.records.len(), 1);

        let duplicated = serde_json::to_string(&SyncSnapshotDocument {
            records: vec![
                document.records[0].clone(),
                SyncSnapshotRecord {
                    id: "reader-settings:1".to_string(),
                    ..document.records[0].clone()
                },
            ],
            ..document
        })
        .unwrap();
        assert!(parse_sync_snapshot_document(&duplicated)
            .unwrap_err()
            .contains("duplicate record id"));
    }

    #[test]
    fn apply_sync_snapshot_replaces_existing_state_roots() {
        let root = temp_root("apply");
        let library_json = root.join("library").join("library.json");
        let bookmarks_root = root.join("reader-bookmarks");
        let notes_root = root.join("reader-notes");
        let highlights_root = root.join("reader-highlights");

        fs::create_dir_all(&bookmarks_root).unwrap();
        fs::create_dir_all(&notes_root).unwrap();
        fs::create_dir_all(&highlights_root).unwrap();
        fs::write(bookmarks_root.join("stale.json"), "{}").unwrap();
        fs::write(notes_root.join("stale.json"), "{}").unwrap();
        fs::write(highlights_root.join("stale.json"), "{}").unwrap();

        let result = apply_sync_snapshot_roots(
            &library_json,
            &bookmarks_root,
            &notes_root,
            &highlights_root,
            &ApplySyncSnapshotRequest {
                library_books: vec![LibraryBookRecord {
                    id: "book-1".to_string(),
                    title: "Snapshot Book".to_string(),
                    author: "Reader".to_string(),
                    format: "EPUB".to_string(),
                    description: None,
                    language: None,
                    publisher: None,
                    collection: Some("Sync".to_string()),
                    tags: vec!["snapshot".to_string()],
                    progress: "上次读到 10%".to_string(),
                    status: "阅读中".to_string(),
                    file_path: "/library/book-1.epub".to_string(),
                    cover_path: None,
                    source_path: Some("/imports/book-1.epub".to_string()),
                    imported_at: 100,
                    progress_fraction: Some(0.1),
                    progress_location: Some("epubcfi(/6/2)".to_string()),
                    koreader_progress_location: Some("/body/DocFragment[1]/body/p".to_string()),
                    last_opened_at: Some(120),
                    library_file_exists: Some(true),
                    source_file_exists: Some(true),
                }],
                bookmarks: vec![SyncSnapshotBookmarksStateRecord {
                    book_key: "/library/book-1.epub".to_string(),
                    bookmarks: vec![ReaderBookmarkRecord {
                        id: "bookmark-1".to_string(),
                        locator: "epubcfi(/6/2)".to_string(),
                        target_href: "epubcfi(/6/2)".to_string(),
                        chapter_label: "Chapter 1".to_string(),
                        chapter_href: "#chapter-1".to_string(),
                        progress_label: "10%".to_string(),
                        location_label: "Chapter 1".to_string(),
                        created_at: 111,
                        koreader: None,
                    }],
                }],
                notes: vec![SyncSnapshotNotesStateRecord {
                    book_key: "/library/book-1.epub".to_string(),
                    notes: vec![ReaderNoteRecord {
                        id: "note-1".to_string(),
                        kind: "highlight".to_string(),
                        cfi: "epubcfi(/6/2)".to_string(),
                        text: "line".to_string(),
                        note: "margin".to_string(),
                        chapter_label: "Chapter 1".to_string(),
                        chapter_href: "#chapter-1".to_string(),
                        created_at: 112,
                        koreader: None,
                    }],
                }],
                highlights_workspace: vec![SyncSnapshotHighlightsWorkspaceRecord {
                    book_key: "/library/book-1.epub".to_string(),
                    state: ReaderHighlightsWorkspaceStateRecord {
                        filter: "selected".to_string(),
                        sort: "recent".to_string(),
                        saved_selections_sort: "oldest".to_string(),
                        saved_selections_refresh_filter: "partial".to_string(),
                        selected_ids: vec!["note-1".to_string()],
                        saved_selections: vec![ReaderHighlightsSelectionSetRecord {
                            id: "selection-1".to_string(),
                            name: "Imported".to_string(),
                            selected_ids: vec!["note-1".to_string()],
                            created_at: 113,
                            import_source: Some(ReaderHighlightsSelectionImportRecord {
                                book_key: "/library/other.epub".to_string(),
                                book_title: "Other".to_string(),
                                format_label: "EPUB".to_string(),
                                selection_name: "Interesting".to_string(),
                                matched_count: 1,
                                total_count: 2,
                                unmatched_count: 1,
                                imported_at: 114,
                                highlights: vec![ReaderNoteRecord {
                                    id: "source-1".to_string(),
                                    kind: "highlight".to_string(),
                                    cfi: "epubcfi(/6/4)".to_string(),
                                    text: "imported".to_string(),
                                    note: "".to_string(),
                                    chapter_label: "Chapter 2".to_string(),
                                    chapter_href: "#chapter-2".to_string(),
                                    created_at: 115,
                                    koreader: None,
                                }],
                            }),
                        }],
                    },
                }],
                reader_settings: Some(SyncSnapshotRecord {
                    schema_version: BR1_SYNC_SNAPSHOT_SCHEMA_VERSION,
                    kind: "reader-settings".to_string(),
                    id: "reader-settings:default".to_string(),
                    updated_at: 200,
                    scope: None,
                    payload: serde_json::json!({
                        "storageKey": "br1.reader.settings",
                        "settings": { "flowMode": "paginated" }
                    }),
                }),
            },
        )
        .unwrap();

        assert_eq!(result.library_book_count, 1);
        assert_eq!(result.bookmark_book_count, 1);
        assert_eq!(result.note_book_count, 1);
        assert_eq!(result.highlights_workspace_book_count, 1);
        assert!(result.restored_reader_settings);
        assert!(!bookmarks_root.join("stale.json").exists());
        assert!(!notes_root.join("stale.json").exists());
        assert!(!highlights_root.join("stale.json").exists());
        assert!(fs::read_to_string(library_json)
            .unwrap()
            .contains("Snapshot Book"));
        assert!(fs::read_to_string(bookmarks_root.join(format!(
            "{}.json",
            crate::util::reader_storage_component_key("/library/book-1.epub")
        )))
        .unwrap()
        .contains("targetHref"));
        assert!(fs::read_to_string(highlights_root.join(format!(
            "{}.json",
            crate::util::reader_storage_component_key("/library/book-1.epub")
        )))
        .unwrap()
        .contains("savedSelectionsRefreshFilter"));
    }

    #[test]
    fn prepare_sync_snapshot_restore_rebuilds_validated_apply_request() {
        let book = LibraryBookRecord {
            id: "book-1".to_string(),
            title: "Snapshot Book".to_string(),
            author: "Reader".to_string(),
            format: "EPUB".to_string(),
            description: None,
            language: None,
            publisher: None,
            collection: Some("Sync".to_string()),
            tags: vec!["snapshot".to_string()],
            progress: "上次读到 10%".to_string(),
            status: "阅读中".to_string(),
            file_path: "/library/book-1.epub".to_string(),
            cover_path: None,
            source_path: Some("/imports/book-1.epub".to_string()),
            imported_at: 100,
            progress_fraction: Some(0.1),
            progress_location: Some("epubcfi(/6/2)".to_string()),
            koreader_progress_location: Some("/body/DocFragment[1]/body/p".to_string()),
            last_opened_at: Some(120),
            library_file_exists: Some(true),
            source_file_exists: Some(true),
        };
        let snapshot = SyncSnapshotDocument {
            schema_version: BR1_SYNC_SNAPSHOT_SCHEMA_VERSION,
            exported_at: 200,
            records: vec![
                library_metadata_sync_record(&book, 200),
                reading_state_sync_record(&book, 200),
                bookmarks_sync_record(
                    &book.file_path,
                    vec![ReaderBookmarkRecord {
                        id: "bookmark-1".to_string(),
                        locator: "epubcfi(/6/2)".to_string(),
                        target_href: "epubcfi(/6/2)".to_string(),
                        chapter_label: "Chapter 1".to_string(),
                        chapter_href: "#chapter-1".to_string(),
                        progress_label: "10%".to_string(),
                        location_label: "Chapter 1".to_string(),
                        created_at: 111,
                        koreader: None,
                    }],
                    200,
                ),
                notes_sync_record(
                    &book.file_path,
                    vec![ReaderNoteRecord {
                        id: "note-1".to_string(),
                        kind: "highlight".to_string(),
                        cfi: "epubcfi(/6/2)".to_string(),
                        text: "line".to_string(),
                        note: "margin".to_string(),
                        chapter_label: "Chapter 1".to_string(),
                        chapter_href: "#chapter-1".to_string(),
                        created_at: 112,
                        koreader: None,
                    }],
                    200,
                ),
                highlights_sync_record(
                    &book.file_path,
                    ReaderHighlightsWorkspaceStateRecord {
                        filter: "selected".to_string(),
                        sort: "recent".to_string(),
                        saved_selections_sort: "oldest".to_string(),
                        saved_selections_refresh_filter: "partial".to_string(),
                        selected_ids: vec!["note-1".to_string()],
                        saved_selections: vec![],
                    },
                    200,
                ),
                SyncSnapshotRecord {
                    schema_version: BR1_SYNC_SNAPSHOT_SCHEMA_VERSION,
                    kind: "reader-settings".to_string(),
                    id: build_scoped_record_id("reader-settings", READER_SETTINGS_STORAGE_KEY),
                    updated_at: 200,
                    scope: Some(serde_json::json!({
                        "storageKey": READER_SETTINGS_STORAGE_KEY
                    })),
                    payload: serde_json::json!({
                        "storageKey": READER_SETTINGS_STORAGE_KEY,
                        "settings": { "flowMode": "paginated" }
                    }),
                },
            ],
        };

        let (request, reader_settings_record) = prepare_sync_snapshot_restore(&snapshot).unwrap();

        assert_eq!(request.library_books.len(), 1);
        assert_eq!(request.library_books[0].file_path, book.file_path);
        assert_eq!(request.library_books[0].progress, book.progress);
        assert_eq!(request.bookmarks.len(), 1);
        assert_eq!(request.notes.len(), 1);
        assert_eq!(request.highlights_workspace.len(), 1);
        assert_eq!(
            reader_settings_record
                .as_ref()
                .and_then(|record| record.payload.get("storageKey"))
                .and_then(|value| value.as_str()),
            Some(READER_SETTINGS_STORAGE_KEY)
        );
    }

    #[test]
    fn prepare_sync_snapshot_restore_rejects_state_for_unknown_book() {
        let book = LibraryBookRecord {
            id: "book-1".to_string(),
            title: "Snapshot Book".to_string(),
            author: "Reader".to_string(),
            format: "EPUB".to_string(),
            description: None,
            language: None,
            publisher: None,
            collection: None,
            tags: vec![],
            progress: "尚未开始".to_string(),
            status: "未开始".to_string(),
            file_path: "/library/book-1.epub".to_string(),
            cover_path: None,
            source_path: None,
            imported_at: 100,
            progress_fraction: None,
            progress_location: None,
            koreader_progress_location: None,
            last_opened_at: None,
            library_file_exists: Some(true),
            source_file_exists: Some(true),
        };
        let snapshot = SyncSnapshotDocument {
            schema_version: BR1_SYNC_SNAPSHOT_SCHEMA_VERSION,
            exported_at: 200,
            records: vec![
                library_metadata_sync_record(&book, 200),
                SyncSnapshotRecord {
                    schema_version: BR1_SYNC_SNAPSHOT_SCHEMA_VERSION,
                    kind: "bookmarks".to_string(),
                    id: build_scoped_record_id("bookmarks", "/library/missing.epub"),
                    updated_at: 200,
                    scope: Some(serde_json::json!({
                        "bookKey": "/library/missing.epub"
                    })),
                    payload: serde_json::json!({
                        "bookKey": "/library/missing.epub",
                        "bookmarks": []
                    }),
                },
            ],
        };

        let error = prepare_sync_snapshot_restore(&snapshot).unwrap_err();
        assert!(error.contains("does not match any imported library book"));
    }
}
