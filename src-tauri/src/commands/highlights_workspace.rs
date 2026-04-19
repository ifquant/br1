use crate::models::{
    ReaderHighlightsWorkspaceEntry, ReaderHighlightsWorkspaceStateRecord,
    READER_HIGHLIGHTS_WORKSPACE_SCHEMA_VERSION,
};
use crate::util::reader_highlights_workspace_file;
use std::fs;

#[tauri::command]
pub(crate) fn load_reader_highlights_workspace_state(
    app: tauri::AppHandle,
    book_key: String,
) -> Result<Option<ReaderHighlightsWorkspaceStateRecord>, String> {
    let state_path = reader_highlights_workspace_file(&app, &book_key)?;
    if !state_path.exists() {
        return Ok(None);
    }

    let raw = fs::read_to_string(state_path).map_err(|error| error.to_string())?;
    let entry: ReaderHighlightsWorkspaceEntry =
        serde_json::from_str(&raw).map_err(|error| error.to_string())?;
    Ok(Some(entry.state))
}

#[tauri::command]
pub(crate) fn save_reader_highlights_workspace_state(
    app: tauri::AppHandle,
    book_key: String,
    state: ReaderHighlightsWorkspaceStateRecord,
) -> Result<(), String> {
    let state_path = reader_highlights_workspace_file(&app, &book_key)?;
    if let Some(parent) = state_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }

    let entry = ReaderHighlightsWorkspaceEntry {
        schema_version: READER_HIGHLIGHTS_WORKSPACE_SCHEMA_VERSION,
        state,
    };
    let raw = serde_json::to_string_pretty(&entry).map_err(|error| error.to_string())?;
    fs::write(&state_path, raw).map_err(|error| error.to_string())?;
    Ok(())
}
