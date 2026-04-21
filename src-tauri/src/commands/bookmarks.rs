use crate::models::{ReaderBookmarkRecord, ReaderBookmarksEntry, READER_BOOKMARKS_SCHEMA_VERSION};
use crate::util::{legacy_reader_bookmarks_file, reader_bookmarks_file};
use std::fs;

#[tauri::command]
pub(crate) fn load_reader_bookmarks(
    app: tauri::AppHandle,
    book_key: String,
) -> Result<Vec<ReaderBookmarkRecord>, String> {
    let bookmarks_path = reader_bookmarks_file(&app, &book_key)?;
    if bookmarks_path.exists() {
        let raw = fs::read_to_string(bookmarks_path).map_err(|error| error.to_string())?;
        let entry: ReaderBookmarksEntry =
            serde_json::from_str(&raw).map_err(|error| error.to_string())?;
        return Ok(entry.bookmarks);
    }

    let legacy_bookmarks_path = legacy_reader_bookmarks_file(&app, &book_key)?;
    if !legacy_bookmarks_path.exists() {
        return Ok(Vec::new());
    }

    let raw = fs::read_to_string(legacy_bookmarks_path).map_err(|error| error.to_string())?;
    let entry: ReaderBookmarksEntry =
        serde_json::from_str(&raw).map_err(|error| error.to_string())?;
    Ok(entry.bookmarks)
}

#[tauri::command]
pub(crate) fn save_reader_bookmarks(
    app: tauri::AppHandle,
    book_key: String,
    bookmarks: Vec<ReaderBookmarkRecord>,
) -> Result<(), String> {
    let bookmarks_path = reader_bookmarks_file(&app, &book_key)?;
    if let Some(parent) = bookmarks_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let entry = ReaderBookmarksEntry {
        schema_version: READER_BOOKMARKS_SCHEMA_VERSION,
        bookmarks,
    };
    let raw = serde_json::to_string_pretty(&entry).map_err(|error| error.to_string())?;
    fs::write(&bookmarks_path, raw).map_err(|error| error.to_string())?;

    let legacy_bookmarks_path = legacy_reader_bookmarks_file(&app, &book_key)?;
    if legacy_bookmarks_path != bookmarks_path && legacy_bookmarks_path.exists() {
        let _ = fs::remove_file(legacy_bookmarks_path);
    }

    Ok(())
}
