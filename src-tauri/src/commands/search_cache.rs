use crate::models::{
    ReaderSearchCacheEntry, ReaderSearchCacheResult, READER_SEARCH_CACHE_SCHEMA_VERSION,
    READER_SEARCH_CACHE_TTL_MS,
};
use crate::util::{
    now_millis, prune_reader_search_cache_book, prune_reader_search_cache_root,
    reader_search_cache_component_key, reader_search_cache_file, reader_search_cache_root,
};
use std::fs;

#[tauri::command]
pub(crate) fn load_reader_search_cache(
    app: tauri::AppHandle,
    book_key: String,
    cache_key: String,
) -> Result<Option<Vec<ReaderSearchCacheResult>>, String> {
    prune_reader_search_cache_root(&app)?;
    let cache_path = reader_search_cache_file(&app, &book_key, &cache_key)?;
    if !cache_path.exists() {
        return Ok(None);
    }

    let raw = fs::read_to_string(&cache_path).map_err(|error| error.to_string())?;
    let now = now_millis()?;

    if let Ok(mut entry) = serde_json::from_str::<ReaderSearchCacheEntry>(&raw) {
        if entry.expires_at <= now {
            let _ = fs::remove_file(&cache_path);
            return Ok(None);
        }

        entry.last_accessed_at = now;
        let updated = serde_json::to_string(&entry).map_err(|error| error.to_string())?;
        fs::write(&cache_path, updated).map_err(|error| error.to_string())?;
        return Ok(Some(entry.results));
    }

    let legacy_results =
        serde_json::from_str::<Vec<ReaderSearchCacheResult>>(&raw).map_err(|error| error.to_string())?;
    let entry = ReaderSearchCacheEntry {
        schema_version: READER_SEARCH_CACHE_SCHEMA_VERSION,
        saved_at: now,
        last_accessed_at: now,
        expires_at: now.saturating_add(READER_SEARCH_CACHE_TTL_MS),
        results: legacy_results.clone(),
    };
    let updated = serde_json::to_string(&entry).map_err(|error| error.to_string())?;
    fs::write(&cache_path, updated).map_err(|error| error.to_string())?;
    Ok(Some(legacy_results))
}

#[tauri::command]
pub(crate) fn save_reader_search_cache(
    app: tauri::AppHandle,
    book_key: String,
    cache_key: String,
    results: Vec<ReaderSearchCacheResult>,
) -> Result<(), String> {
    prune_reader_search_cache_root(&app)?;
    let cache_path = reader_search_cache_file(&app, &book_key, &cache_key)?;
    if let Some(parent) = cache_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let now = now_millis()?;
    let entry = ReaderSearchCacheEntry {
        schema_version: READER_SEARCH_CACHE_SCHEMA_VERSION,
        saved_at: now,
        last_accessed_at: now,
        expires_at: now.saturating_add(READER_SEARCH_CACHE_TTL_MS),
        results,
    };
    let raw = serde_json::to_string(&entry).map_err(|error| error.to_string())?;
    fs::write(cache_path, raw).map_err(|error| error.to_string())?;
    prune_reader_search_cache_book(&app, &book_key)?;
    Ok(())
}

#[tauri::command]
pub(crate) fn clear_reader_search_cache(app: tauri::AppHandle, book_key: String) -> Result<(), String> {
    let root = reader_search_cache_root(&app)?;
    let book_dir = root.join(reader_search_cache_component_key(&book_key));
    if book_dir.exists() {
        fs::remove_dir_all(book_dir).map_err(|error| error.to_string())?;
    }
    Ok(())
}
