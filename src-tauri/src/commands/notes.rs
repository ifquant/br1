// Ownership: this command module is the desktop source of truth for persisted
// reader notes. The renderer may edit note text, but migration and durable
// storage compatibility stay owned here.

use crate::models::{ReaderNoteRecord, ReaderNotesEntry, READER_NOTES_SCHEMA_VERSION};
use crate::util::{legacy_reader_notes_file, reader_notes_file};
use std::fs;

#[tauri::command]
pub(crate) fn load_reader_notes(
    app: tauri::AppHandle,
    book_key: String,
) -> Result<Vec<ReaderNoteRecord>, String> {
    let notes_path = reader_notes_file(&app, &book_key)?;
    if notes_path.exists() {
        let raw = fs::read_to_string(notes_path).map_err(|error| error.to_string())?;
        let entry: ReaderNotesEntry =
            serde_json::from_str(&raw).map_err(|error| error.to_string())?;
        return Ok(entry.notes);
    }

    let legacy_notes_path = legacy_reader_notes_file(&app, &book_key)?;
    // Refactor risk: this legacy fallback preserves notes written before the
    // per-book storage layout stabilized. Removing it is an explicit migration.
    if !legacy_notes_path.exists() {
        return Ok(Vec::new());
    }

    let raw = fs::read_to_string(legacy_notes_path).map_err(|error| error.to_string())?;
    let entry: ReaderNotesEntry = serde_json::from_str(&raw).map_err(|error| error.to_string())?;
    Ok(entry.notes)
}

#[tauri::command]
pub(crate) fn save_reader_notes(
    app: tauri::AppHandle,
    book_key: String,
    notes: Vec<ReaderNoteRecord>,
) -> Result<(), String> {
    let notes_path = reader_notes_file(&app, &book_key)?;
    if let Some(parent) = notes_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let entry = ReaderNotesEntry {
        schema_version: READER_NOTES_SCHEMA_VERSION,
        notes,
    };
    let raw = serde_json::to_string_pretty(&entry).map_err(|error| error.to_string())?;
    fs::write(&notes_path, raw).map_err(|error| error.to_string())?;

    let legacy_notes_path = legacy_reader_notes_file(&app, &book_key)?;
    // Successful writes collapse ownership back to the current file so later
    // reloads do not race between legacy and current note stores.
    if legacy_notes_path != notes_path && legacy_notes_path.exists() {
        let _ = fs::remove_file(legacy_notes_path);
    }

    Ok(())
}
