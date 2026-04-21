use crate::models::{
    LibraryBookRecord, ReaderSearchCacheEntry, ReaderSearchCacheFileInfo, ReadestBookConfig,
    ReadestBookMetadata, ReadestBookMetadataSummary, ReadestBookRecord,
    READER_SEARCH_CACHE_MAX_FILES_PER_BOOK, READER_SEARCH_CACHE_MAX_FILES_TOTAL,
};
use base64::Engine;
use sha2::{Digest, Sha256};
use std::fs;
use std::path::{Component, Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

pub(crate) fn ensure_library_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    let library_root = app_data_dir.join("library");
    fs::create_dir_all(&library_root).map_err(|error| error.to_string())?;
    Ok(library_root)
}

pub(crate) fn readest_library_json_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(readest_books_root(app)?.join("library.json"))
}

pub(crate) fn readest_books_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    let support_root = app_data_dir
        .parent()
        .ok_or_else(|| "Unable to locate application support root".to_string())?;
    Ok(support_root
        .join("com.bilingify.readest")
        .join("Readest")
        .join("Books"))
}

pub(crate) fn library_json_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(ensure_library_root(app)?.join("library.json"))
}

pub(crate) fn reader_search_cache_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("reader-search"))
}

pub(crate) fn reader_notes_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("reader-notes"))
}

pub(crate) fn reader_bookmarks_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("reader-bookmarks"))
}

pub(crate) fn reader_highlights_workspace_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("reader-highlights-workspace"))
}

pub(crate) fn reader_search_cache_component_key(value: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(value.as_bytes());
    format!("{:x}", hasher.finalize())
}

pub(crate) fn reader_storage_component_key(value: &str) -> String {
    reader_search_cache_component_key(value)
}

pub(crate) fn reader_search_cache_file(
    app: &tauri::AppHandle,
    book_key: &str,
    cache_key: &str,
) -> Result<PathBuf, String> {
    let root = reader_search_cache_root(app)?;
    let book_dir = reader_search_cache_component_key(book_key);
    let cache_file = format!("{}.json", reader_search_cache_component_key(cache_key));
    Ok(root.join(book_dir).join(cache_file))
}

pub(crate) fn reader_notes_file(app: &tauri::AppHandle, book_key: &str) -> Result<PathBuf, String> {
    let root = reader_notes_root(app)?;
    let safe_key = reader_storage_component_key(book_key);
    Ok(root.join(format!("{safe_key}.json")))
}

pub(crate) fn legacy_reader_notes_file(
    app: &tauri::AppHandle,
    book_key: &str,
) -> Result<PathBuf, String> {
    let root = reader_notes_root(app)?;
    let safe_key = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(book_key);
    Ok(root.join(format!("{safe_key}.json")))
}

pub(crate) fn reader_bookmarks_file(
    app: &tauri::AppHandle,
    book_key: &str,
) -> Result<PathBuf, String> {
    let root = reader_bookmarks_root(app)?;
    let safe_key = reader_storage_component_key(book_key);
    Ok(root.join(format!("{safe_key}.json")))
}

pub(crate) fn legacy_reader_bookmarks_file(
    app: &tauri::AppHandle,
    book_key: &str,
) -> Result<PathBuf, String> {
    let root = reader_bookmarks_root(app)?;
    let safe_key = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(book_key);
    Ok(root.join(format!("{safe_key}.json")))
}

pub(crate) fn reader_highlights_workspace_file(
    app: &tauri::AppHandle,
    book_key: &str,
) -> Result<PathBuf, String> {
    let root = reader_highlights_workspace_root(app)?;
    let safe_key = reader_storage_component_key(book_key);
    Ok(root.join(format!("{safe_key}.json")))
}

pub(crate) fn prune_reader_search_cache_root(app: &tauri::AppHandle) -> Result<(), String> {
    let root = reader_search_cache_root(app)?;
    if !root.exists() {
        return Ok(());
    }

    let now = now_millis()?;
    let mut files = collect_reader_search_cache_files(&root)?;

    for info in &files {
        if reader_search_cache_file_expired(&info.path, now)? {
            let _ = fs::remove_file(&info.path);
        }
    }

    files = collect_reader_search_cache_files(&root)?;
    if files.len() <= READER_SEARCH_CACHE_MAX_FILES_TOTAL {
        return Ok(());
    }

    files.sort_by_key(|info| info.modified_ms);
    let overflow = files
        .len()
        .saturating_sub(READER_SEARCH_CACHE_MAX_FILES_TOTAL);
    for info in files.into_iter().take(overflow) {
        let _ = fs::remove_file(info.path);
    }

    Ok(())
}

pub(crate) fn prune_reader_search_cache_book(
    app: &tauri::AppHandle,
    book_key: &str,
) -> Result<(), String> {
    let root = reader_search_cache_root(app)?;
    let book_dir = root.join(reader_search_cache_component_key(book_key));
    if !book_dir.exists() {
        return Ok(());
    }

    let now = now_millis()?;
    let mut files = collect_reader_search_cache_files(&book_dir)?;

    for info in &files {
        if reader_search_cache_file_expired(&info.path, now)? {
            let _ = fs::remove_file(&info.path);
        }
    }

    files = collect_reader_search_cache_files(&book_dir)?;
    if files.len() <= READER_SEARCH_CACHE_MAX_FILES_PER_BOOK {
        return Ok(());
    }

    files.sort_by_key(|info| info.modified_ms);
    let overflow = files
        .len()
        .saturating_sub(READER_SEARCH_CACHE_MAX_FILES_PER_BOOK);
    for info in files.into_iter().take(overflow) {
        let _ = fs::remove_file(info.path);
    }

    Ok(())
}

fn collect_reader_search_cache_files(
    root: &Path,
) -> Result<Vec<ReaderSearchCacheFileInfo>, String> {
    let mut files = Vec::new();
    if !root.exists() {
        return Ok(files);
    }

    for entry in fs::read_dir(root).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
        if path.is_dir() {
            files.extend(collect_reader_search_cache_files(&path)?);
            continue;
        }
        if path.extension().and_then(|value| value.to_str()) != Some("json") {
            continue;
        }

        let modified_ms = entry
            .metadata()
            .map_err(|error| error.to_string())?
            .modified()
            .map_err(|error| error.to_string())?
            .duration_since(UNIX_EPOCH)
            .map_err(|error| error.to_string())?
            .as_millis() as u64;

        files.push(ReaderSearchCacheFileInfo { path, modified_ms });
    }

    Ok(files)
}

fn reader_search_cache_file_expired(path: &Path, now: u64) -> Result<bool, String> {
    let raw = fs::read_to_string(path).map_err(|error| error.to_string())?;

    if let Ok(entry) = serde_json::from_str::<ReaderSearchCacheEntry>(&raw) {
        return Ok(entry.expires_at <= now);
    }

    Ok(false)
}

pub(crate) fn load_library_records(path: &Path) -> Result<Vec<LibraryBookRecord>, String> {
    if !path.exists() {
        return Ok(Vec::new());
    }

    let json = fs::read_to_string(path).map_err(|error| error.to_string())?;
    serde_json::from_str(&json).map_err(|error| error.to_string())
}

pub(crate) fn normalize_pdf_progress_location(record: &mut LibraryBookRecord) -> bool {
    if !record.format.eq_ignore_ascii_case("PDF") {
        return false;
    }

    let Some(progress_location) = record.progress_location.as_deref() else {
        return false;
    };

    let normalized = if let Some((current, total)) = parse_page_location(progress_location) {
        Some(format!("Page {} / {}", current.max(1), total.max(1)))
    } else if progress_location.starts_with("epubcfi(") {
        parse_section_status(&record.status)
            .map(|(current, total)| format!("Page {} / {}", current.max(1), total.max(1)))
    } else {
        None
    };

    if record.progress_location == normalized {
        return false;
    }

    record.progress_location = normalized;
    true
}

pub(crate) fn normalize_library_records(records: &mut [LibraryBookRecord]) -> bool {
    let mut changed = false;
    for record in records {
        changed |= normalize_pdf_progress_location(record);
    }
    changed
}

fn parse_section_status(status: &str) -> Option<(u64, u64)> {
    let trimmed = status.trim();
    let remainder = trimmed.strip_prefix("Section ")?;
    let (current, total) = remainder.split_once(" / ")?;
    let current = current.trim().parse::<u64>().ok()?;
    let total = total.trim().parse::<u64>().ok()?;
    Some((current, total))
}

fn parse_page_location(progress_location: &str) -> Option<(u64, u64)> {
    let remainder = progress_location.trim().strip_prefix("Page ")?;
    let (current, total) = remainder.split_once(" / ")?;
    let current = current.trim().parse::<u64>().ok()?;
    let total = total.trim().parse::<u64>().ok()?;
    Some((current, total))
}

pub(crate) fn load_readest_records(path: &Path) -> Result<Vec<ReadestBookRecord>, String> {
    if !path.exists() {
        return Ok(Vec::new());
    }

    let json = fs::read_to_string(path).map_err(|error| error.to_string())?;
    serde_json::from_str(&json).map_err(|error| error.to_string())
}

pub(crate) fn load_readest_config(
    readest_books_root: &Path,
    hash: &str,
) -> Result<ReadestBookConfig, String> {
    let Some(book_dir) = resolve_readest_book_dir(readest_books_root, hash)? else {
        return Ok(ReadestBookConfig::default());
    };
    let config_path = book_dir.join("config.json");
    if !config_path.exists() {
        return Ok(ReadestBookConfig::default());
    }
    let config_path = fs::canonicalize(config_path).map_err(|error| error.to_string())?;
    if !config_path.is_file() || !config_path.starts_with(&book_dir) {
        return Ok(ReadestBookConfig::default());
    }

    let json = fs::read_to_string(config_path).map_err(|error| error.to_string())?;
    serde_json::from_str(&json).map_err(|error| error.to_string())
}

pub(crate) fn parse_readest_metadata(
    metadata: Option<&serde_json::Value>,
) -> Result<ReadestBookMetadataSummary, String> {
    let Some(metadata) = metadata else {
        return Ok(ReadestBookMetadataSummary::default());
    };
    let parsed: ReadestBookMetadata = match metadata {
        serde_json::Value::Null => return Ok(ReadestBookMetadataSummary::default()),
        serde_json::Value::String(raw) => {
            if raw.trim().is_empty() {
                return Ok(ReadestBookMetadataSummary::default());
            }
            serde_json::from_str(raw).map_err(|error| error.to_string())?
        }
        serde_json::Value::Object(_) => {
            serde_json::from_value(metadata.clone()).map_err(|error| error.to_string())?
        }
        _ => return Ok(ReadestBookMetadataSummary::default()),
    };

    Ok(ReadestBookMetadataSummary {
        description: parsed
            .description
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty()),
        publisher: stringify_metadata_value(parsed.publisher),
        language: stringify_metadata_value(parsed.language),
    })
}

fn stringify_metadata_value(value: Option<serde_json::Value>) -> Option<String> {
    let value = value?;

    let rendered = match value {
        serde_json::Value::String(value) => value,
        serde_json::Value::Array(values) => values
            .into_iter()
            .filter_map(|entry| match entry {
                serde_json::Value::String(text) => Some(text),
                serde_json::Value::Object(map) => map
                    .get("name")
                    .and_then(|name| name.as_str())
                    .map(|text| text.to_string()),
                _ => None,
            })
            .collect::<Vec<_>>()
            .join(", "),
        serde_json::Value::Object(map) => map
            .get("name")
            .and_then(|name| name.as_str())
            .unwrap_or_default()
            .to_string(),
        _ => String::new(),
    };

    let rendered = rendered.trim().to_string();
    if rendered.is_empty() {
        None
    } else {
        Some(rendered)
    }
}

pub(crate) fn save_library_records(
    path: &Path,
    records: &[LibraryBookRecord],
) -> Result<(), String> {
    let json = serde_json::to_string_pretty(records).map_err(|error| error.to_string())?;
    fs::write(path, json).map_err(|error| error.to_string())
}

pub(crate) fn now_millis() -> Result<u64, String> {
    Ok(SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_millis() as u64)
}

pub(crate) fn sanitize_filename(filename: &str) -> String {
    filename
        .chars()
        .map(|character| match character {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => character,
        })
        .collect()
}

fn is_single_safe_path_component(value: &str) -> bool {
    let mut components = Path::new(value).components();
    matches!(components.next(), Some(Component::Normal(_))) && components.next().is_none()
}

pub(crate) fn resolve_readest_book_dir(
    readest_books_root: &Path,
    hash: &str,
) -> Result<Option<PathBuf>, String> {
    if !is_single_safe_path_component(hash) || !readest_books_root.exists() {
        return Ok(None);
    }

    let readest_books_root =
        fs::canonicalize(readest_books_root).map_err(|error| error.to_string())?;
    let book_dir = readest_books_root.join(hash);
    if !book_dir.exists() {
        return Ok(None);
    }

    let book_dir = fs::canonicalize(book_dir).map_err(|error| error.to_string())?;
    if !book_dir.is_dir() || !book_dir.starts_with(&readest_books_root) {
        return Ok(None);
    }

    Ok(Some(book_dir))
}

pub(crate) fn find_readest_book_file(
    readest_books_root: &Path,
    readest_record: &ReadestBookRecord,
) -> Result<Option<PathBuf>, String> {
    let Some(book_dir) = resolve_readest_book_dir(readest_books_root, &readest_record.hash)? else {
        return Ok(None);
    };

    let format = readest_record.format.to_lowercase();
    let mut candidates = Vec::new();
    for entry in fs::read_dir(&book_dir).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = fs::canonicalize(entry.path()).map_err(|error| error.to_string())?;
        if !path.starts_with(&book_dir) {
            continue;
        }
        if !path.is_file() {
            continue;
        }

        let extension = path
            .extension()
            .and_then(|value| value.to_str())
            .unwrap_or("")
            .to_lowercase();
        if extension == format {
            candidates.push(path);
        }
    }

    Ok(candidates.into_iter().next())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn unique_test_dir(name: &str) -> PathBuf {
        let suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system clock should be after unix epoch")
            .as_nanos();
        std::env::temp_dir().join(format!("br1-util-{name}-{suffix}"))
    }

    fn readest_record(hash: &str, format: &str) -> ReadestBookRecord {
        ReadestBookRecord {
            hash: hash.to_string(),
            title: "Readest title".to_string(),
            author: "Readest author".to_string(),
            format: format.to_string(),
            metadata: None,
            downloaded_at: None,
            created_at: None,
            progress: None,
        }
    }

    #[test]
    fn renderer_controlled_storage_keys_do_not_create_path_components() {
        let attacker_key = "../../Library/Application Support/com.apple.secret/book.epub?x=/tmp";
        let search_key = reader_search_cache_component_key(attacker_key);
        let storage_key = reader_storage_component_key(attacker_key);
        let legacy_key = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(attacker_key);

        for key in [search_key, storage_key, legacy_key] {
            assert!(!key.contains('/'));
            assert!(!key.contains('\\'));
            assert!(!key.contains(".."));
            assert!(Path::new(&key)
                .components()
                .all(|component| matches!(component, Component::Normal(_))));
        }
    }

    #[test]
    fn readest_book_dirs_reject_path_traversal_hashes() {
        let root = unique_test_dir("readest-dir-traversal");
        fs::create_dir_all(&root).expect("create root");
        let outside = root
            .parent()
            .expect("temp root should have parent")
            .join("outside-readest-book");
        fs::create_dir_all(&outside).expect("create outside");

        assert!(resolve_readest_book_dir(&root, "../outside-readest-book")
            .expect("resolve should not fail")
            .is_none());
        assert!(resolve_readest_book_dir(&root, "nested/book")
            .expect("resolve should not fail")
            .is_none());

        let _ = fs::remove_dir_all(&root);
        let _ = fs::remove_dir_all(&outside);
    }

    #[test]
    fn readest_book_file_rejects_symlink_escape() {
        let root = unique_test_dir("readest-symlink");
        let book_dir = root.join("safehash");
        fs::create_dir_all(&book_dir).expect("create book dir");
        let outside = unique_test_dir("readest-outside");
        fs::create_dir_all(&outside).expect("create outside");
        let outside_book = outside.join("escaped.epub");
        fs::write(&outside_book, b"outside").expect("write outside book");

        #[cfg(unix)]
        std::os::unix::fs::symlink(&outside_book, book_dir.join("escaped.epub"))
            .expect("create symlink");
        #[cfg(windows)]
        std::os::windows::fs::symlink_file(&outside_book, book_dir.join("escaped.epub"))
            .expect("create symlink");

        let resolved = find_readest_book_file(&root, &readest_record("safehash", "epub"))
            .expect("readest lookup should not fail");
        assert!(resolved.is_none());

        let _ = fs::remove_dir_all(&root);
        let _ = fs::remove_dir_all(&outside);
    }
}

pub(crate) fn format_readest_progress(progress: Option<&[u64]>) -> String {
    let Some([current, total, ..]) = progress else {
        return "尚未开始".to_string();
    };

    format!("{current}/{total}")
}

pub(crate) fn readest_progress_fraction(progress: Option<&[u64]>) -> Option<f64> {
    let Some([current, total, ..]) = progress else {
        return None;
    };
    if *total == 0 {
        return None;
    }

    Some((*current as f64 / *total as f64).clamp(0.0, 1.0))
}

pub(crate) fn cover_mime_type(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_lowercase()
        .as_str()
    {
        "svg" => "image/svg+xml",
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        _ => "image/png",
    }
}

pub(crate) fn book_mime_type(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_lowercase()
        .as_str()
    {
        "pdf" => "application/pdf",
        "mobi" => "application/x-mobipocket-ebook",
        "azw3" => "application/vnd.amazon.ebook",
        "fb2" => "application/x-fictionbook+xml",
        "cbz" => "application/vnd.comicbook+zip",
        "txt" => "text/plain",
        _ => "application/epub+zip",
    }
}
