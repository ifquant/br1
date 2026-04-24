use crate::models::{
    ApplySyncSnapshotRequest, ApplySyncSnapshotResult, ReaderBookmarksEntry,
    KoReaderSyncExchangeExportDialogResult, KoReaderSyncExchangeImportDialogResult,
    ReaderHighlightsWorkspaceEntry, ReaderNotesEntry, SyncSnapshotDocument,
    SyncSnapshotExportDialogResult, SyncSnapshotImportDialogResult, BR1_SYNC_SNAPSHOT_SCHEMA_VERSION,
    READER_BOOKMARKS_SCHEMA_VERSION, READER_HIGHLIGHTS_WORKSPACE_SCHEMA_VERSION,
    READER_NOTES_SCHEMA_VERSION,
};
use crate::util::{
    ensure_library_root, library_json_path, now_millis, reader_bookmarks_root,
    reader_highlights_workspace_root, reader_notes_root, reader_storage_component_key,
    save_library_records, sync_snapshots_root,
};
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use tauri_plugin_dialog::DialogExt;

const SYNC_SNAPSHOT_DIALOG_EXTENSIONS: &[&str] = &["json"];
const KOREADER_SYNC_EXCHANGE_SCHEMA_VERSION: u64 = 1;

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

fn validate_koreader_sync_exchange(document: &serde_json::Value) -> Result<usize, String> {
    let object = document
        .as_object()
        .ok_or_else(|| "KOReader exchange document must be a JSON object.".to_string())?;
    let schema_version = object
        .get("schemaVersion")
        .and_then(|value| value.as_u64())
        .ok_or_else(|| "KOReader exchange document is missing schemaVersion.".to_string())?;
    if schema_version != KOREADER_SYNC_EXCHANGE_SCHEMA_VERSION {
        return Err(format!(
            "Unsupported KOReader exchange schema version: {schema_version}"
        ));
    }

    let books = object
        .get("books")
        .and_then(|value| value.as_array())
        .ok_or_else(|| "KOReader exchange document is missing a books array.".to_string())?;

    for (index, book) in books.iter().enumerate() {
        let Some(book) = book.as_object() else {
            return Err(format!("KOReader exchange book {} must be an object.", index + 1));
        };
        let title = book.get("title").and_then(|value| value.as_str()).unwrap_or("").trim();
        let author = book.get("author").and_then(|value| value.as_str()).unwrap_or("").trim();
        let format = book.get("format").and_then(|value| value.as_str()).unwrap_or("").trim();
        if title.is_empty() || author.is_empty() || format.is_empty() {
            return Err(format!(
                "KOReader exchange book {} is missing title, author, or format.",
                index + 1
            ));
        }
    }

    Ok(books.len())
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
pub(crate) async fn load_koreader_sync_exchange_dialog(
    app: tauri::AppHandle,
) -> Result<KoReaderSyncExchangeImportDialogResult, String> {
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
        return Ok(KoReaderSyncExchangeImportDialogResult {
            cancelled: true,
            file_name: None,
            book_count: 0,
            document: None,
        });
    };

    let path = resolve_dialog_file_path(selected)?;
    let raw = fs::read_to_string(&path).map_err(|error| error.to_string())?;
    let document: serde_json::Value =
        serde_json::from_str(&raw).map_err(|error| format!("Exchange file is not valid JSON: {error}"))?;
    let book_count = validate_koreader_sync_exchange(&document)?;
    Ok(KoReaderSyncExchangeImportDialogResult {
        cancelled: false,
        file_name: path.file_name().and_then(|value| value.to_str()).map(str::to_string),
        book_count,
        document: Some(document),
    })
}

#[tauri::command]
pub(crate) fn apply_sync_snapshot(
    app: tauri::AppHandle,
    request: ApplySyncSnapshotRequest,
) -> Result<ApplySyncSnapshotResult, String> {
    ensure_library_root(&app)?;
    let library_json = library_json_path(&app)?;
    let bookmarks_root = reader_bookmarks_root(&app)?;
    let notes_root = reader_notes_root(&app)?;
    let highlights_root = reader_highlights_workspace_root(&app)?;

    apply_sync_snapshot_roots(
        &library_json,
        &bookmarks_root,
        &notes_root,
        &highlights_root,
        &request,
    )
}

#[cfg(test)]
mod tests {
    use super::{apply_sync_snapshot_roots, parse_sync_snapshot_document, write_sync_snapshot_document};
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
}
