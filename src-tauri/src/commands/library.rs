use crate::models::{
    AssociatedBookOpenRequest, LibraryBookBinary, LibraryBookRecord, LibraryRepairCandidatePreview,
    PendingAssociatedBookOpenRequests, ReadestImportResult, ReadestLibrarySummary,
    RemovedLibraryBookRecords, TrustedAssociatedBookOpenPaths, TrustedLibraryImportPaths,
};
use crate::util::{
    book_mime_type, cover_mime_type, ensure_library_root, find_readest_book_file,
    format_readest_progress, library_json_path, load_library_records, load_readest_config,
    load_readest_records, normalize_library_records, normalize_pdf_progress_location, now_millis,
    parse_readest_metadata, readest_books_root, readest_library_json_path,
    readest_progress_fraction, sanitize_filename, save_library_records,
};
use base64::Engine;
use quick_xml::events::Event;
use quick_xml::name::QName;
use quick_xml::Reader;
use sha2::{Digest, Sha256};
use std::collections::HashSet;
use std::fs;
use std::io::{ErrorKind, Read};
use std::path::{Component, Path, PathBuf};
use tauri::{Emitter, Manager};
use tauri_plugin_dialog::DialogExt;
use zip::ZipArchive;

pub(crate) const ASSOCIATED_BOOK_OPEN_EVENT: &str = "br1:associated-book-open-requested";
const SUPPORTED_BOOK_DIALOG_EXTENSIONS: &[&str] =
    &["epub", "pdf", "fb2", "mobi", "azw3", "cbz", "txt"];

fn title_looks_like_stored_filename(value: &str) -> bool {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return false;
    }

    let has_prefixed_id = trimmed
        .split_once('-')
        .map(|(prefix, _)| prefix.chars().all(|character| character.is_ascii_digit()))
        .unwrap_or(false);
    let lower = trimmed.to_ascii_lowercase();
    has_prefixed_id
        && [".epub", ".pdf", ".fb2", ".mobi", ".azw3", ".cbz", ".txt"]
            .iter()
            .any(|suffix| lower.ends_with(suffix))
}

fn is_supported_associated_book_path(path: &Path) -> bool {
    let Some(extension) = path.extension().and_then(|value| value.to_str()) else {
        return false;
    };

    SUPPORTED_BOOK_DIALOG_EXTENSIONS.contains(&extension.to_ascii_lowercase().as_str())
}

fn is_supported_cover_path(path: &Path) -> bool {
    let Some(extension) = path.extension().and_then(|value| value.to_str()) else {
        return false;
    };

    matches!(
        extension.to_ascii_lowercase().as_str(),
        "svg" | "jpg" | "jpeg" | "png" | "webp"
    )
}

fn canonical_path_key(path: &Path) -> String {
    path.to_string_lossy().to_string()
}

fn canonical_library_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let library_root = ensure_library_root(app)?;
    fs::canonicalize(library_root).map_err(|error| error.to_string())
}

fn canonicalize_existing_file_path(file_path: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(file_path);
    let canonical = fs::canonicalize(&path).map_err(|error| error.to_string())?;
    if !canonical.is_file() {
        return Err("Requested path is not a file".to_string());
    }

    Ok(canonical)
}

fn trusted_associated_book_paths_contains(
    app: &tauri::AppHandle,
    path: &Path,
) -> Result<bool, String> {
    trusted_associated_book_path_key_contains(app, &canonical_path_key(path))
}

fn trusted_associated_book_path_key_contains(
    app: &tauri::AppHandle,
    path_key: &str,
) -> Result<bool, String> {
    let trusted = app.state::<TrustedAssociatedBookOpenPaths>();
    let trusted = trusted
        .0
        .lock()
        .map_err(|_| "Failed to lock trusted associated-book paths".to_string())?;
    Ok(trusted.contains(path_key))
}

fn trusted_library_import_path_key_contains(
    app: &tauri::AppHandle,
    path_key: &str,
) -> Result<bool, String> {
    let trusted = app.state::<TrustedLibraryImportPaths>();
    let trusted = trusted
        .0
        .lock()
        .map_err(|_| "Failed to lock trusted library import paths".to_string())?;
    Ok(trusted.contains(path_key))
}

fn register_trusted_library_import_path(app: &tauri::AppHandle, path: &Path) -> Result<(), String> {
    let trusted = app.state::<TrustedLibraryImportPaths>();
    let mut trusted = trusted
        .0
        .lock()
        .map_err(|_| "Failed to lock trusted library import paths".to_string())?;
    trusted.insert(canonical_path_key(path));
    Ok(())
}

fn register_trusted_library_import_paths(
    app: &tauri::AppHandle,
    paths: &[PathBuf],
) -> Result<(), String> {
    for path in paths {
        register_trusted_library_import_path(app, path)?;
    }
    Ok(())
}

fn resolve_dialog_file_path(file_path: tauri_plugin_dialog::FilePath) -> Result<PathBuf, String> {
    file_path.into_path().map_err(|error| error.to_string())
}

fn normalize_selected_library_book_path(file_path: PathBuf) -> Result<PathBuf, String> {
    let canonical = fs::canonicalize(&file_path).map_err(|error| error.to_string())?;
    if !canonical.is_file() {
        return Err("Selected path is not a file".to_string());
    }
    if !is_supported_associated_book_path(&canonical) {
        return Err("Selected file format is not supported by br1".to_string());
    }
    Ok(canonical)
}

fn register_trusted_associated_book_paths<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    requests: &[AssociatedBookOpenRequest],
) -> Result<(), String> {
    let trusted = app.state::<TrustedAssociatedBookOpenPaths>();
    let mut trusted = trusted
        .0
        .lock()
        .map_err(|_| "Failed to lock trusted associated-book paths".to_string())?;

    for request in requests {
        let canonical = canonicalize_existing_file_path(&request.path)?;
        if is_supported_associated_book_path(&canonical) {
            trusted.insert(canonical_path_key(&canonical));
        }
    }

    Ok(())
}

fn resolve_trusted_library_book_path(
    app: &tauri::AppHandle,
    file_path: &str,
) -> Result<PathBuf, String> {
    let canonical = canonicalize_existing_file_path(file_path)?;
    if !is_supported_associated_book_path(&canonical) {
        return Err("Unsupported library book format".to_string());
    }

    let library_root = canonical_library_root(app)?;
    if canonical.starts_with(&library_root)
        || trusted_associated_book_paths_contains(app, &canonical)?
    {
        return Ok(canonical);
    }

    Err("Book file path is not an approved library source".to_string())
}

fn resolve_library_owned_cover_path(
    app: &tauri::AppHandle,
    file_path: &str,
) -> Result<PathBuf, String> {
    let canonical = canonicalize_existing_file_path(file_path)?;
    if !is_supported_cover_path(&canonical) {
        return Err("Unsupported library cover format".to_string());
    }

    let library_root = canonical_library_root(app)?;
    if canonical.starts_with(&library_root) {
        return Ok(canonical);
    }

    Err("Cover file path is not a br1 library asset".to_string())
}

fn has_parent_dir_component(path: &Path) -> bool {
    path.components()
        .any(|component| matches!(component, Component::ParentDir))
}

fn canonical_existing_ancestor(path: &Path) -> Result<PathBuf, String> {
    let mut current = path;
    loop {
        if current.exists() {
            return fs::canonicalize(current).map_err(|error| error.to_string());
        }
        current = current
            .parent()
            .ok_or_else(|| "No existing ancestor for library path".to_string())?;
    }
}

fn resolve_library_owned_destination_path(
    app: &tauri::AppHandle,
    file_path: &str,
) -> Result<PathBuf, String> {
    let library_root = canonical_library_root(app)?;
    let path = PathBuf::from(file_path);
    if !path.is_absolute() || has_parent_dir_component(&path) {
        return Err("Library destination path must be absolute and normalized".to_string());
    }
    if !is_supported_associated_book_path(&path) {
        return Err("Unsupported library book format".to_string());
    }
    if path.exists() {
        let canonical = canonicalize_existing_file_path(file_path)?;
        if !canonical.starts_with(&library_root) {
            return Err("Cannot restore a library record outside the br1 library root".to_string());
        }
        return Ok(canonical);
    }

    let parent = path
        .parent()
        .ok_or_else(|| "Library destination path is missing a parent directory".to_string())?;
    if has_parent_dir_component(parent) {
        return Err("Cannot restore a library record outside the br1 library root".to_string());
    }

    let ancestor = canonical_existing_ancestor(parent)?;
    if !ancestor.starts_with(&library_root) {
        return Err("Cannot restore a library record outside the br1 library root".to_string());
    }

    Ok(path)
}

fn find_persisted_library_record(
    records: &[LibraryBookRecord],
    record_id: &str,
) -> Option<LibraryBookRecord> {
    records
        .iter()
        .find(|record| record.id == record_id || record.file_path == record_id)
        .cloned()
}

fn remember_removed_library_record(
    app: &tauri::AppHandle,
    record: LibraryBookRecord,
) -> Result<(), String> {
    let removed = app.state::<RemovedLibraryBookRecords>();
    let mut removed = removed
        .0
        .lock()
        .map_err(|_| "Failed to lock removed library records".to_string())?;
    removed.insert(record.id.clone(), record.clone());
    removed.insert(record.file_path.clone(), record);
    Ok(())
}

fn get_removed_library_record(
    app: &tauri::AppHandle,
    record_id: &str,
) -> Result<Option<LibraryBookRecord>, String> {
    let removed = app.state::<RemovedLibraryBookRecords>();
    let removed = removed
        .0
        .lock()
        .map_err(|_| "Failed to lock removed library records".to_string())?;
    Ok(removed.get(record_id).cloned())
}

fn forget_removed_library_record(
    app: &tauri::AppHandle,
    record: &LibraryBookRecord,
) -> Result<(), String> {
    let removed = app.state::<RemovedLibraryBookRecords>();
    let mut removed = removed
        .0
        .lock()
        .map_err(|_| "Failed to lock removed library records".to_string())?;
    removed.remove(&record.id);
    removed.remove(&record.file_path);
    Ok(())
}

fn persisted_record_source_path_key_contains(
    records: &[LibraryBookRecord],
    path_key: &str,
) -> bool {
    records
        .iter()
        .filter_map(|record| record.source_path.as_deref())
        .any(|source_path| source_path == path_key)
}

fn resolve_trusted_import_source_path(
    app: &tauri::AppHandle,
    records: &[LibraryBookRecord],
    file_path: &str,
) -> Result<PathBuf, String> {
    let path_key = canonical_path_key(Path::new(file_path));
    let is_trusted = trusted_library_import_path_key_contains(app, &path_key)?
        || trusted_associated_book_path_key_contains(app, &path_key)?
        || persisted_record_source_path_key_contains(records, &path_key);
    if !is_trusted {
        return Err("Book import path is not an approved picker or library source".to_string());
    }

    let canonical = canonicalize_existing_file_path(file_path)?;
    if is_supported_associated_book_path(&canonical) {
        return Ok(canonical);
    }

    Err("Unsupported library book format".to_string())
}

fn strip_wrapping_quotes(value: &str) -> &str {
    let trimmed = value.trim();
    if trimmed.len() >= 2 {
        let bytes = trimmed.as_bytes();
        let first = bytes[0];
        let last = bytes[trimmed.len() - 1];
        if (first == b'"' && last == b'"') || (first == b'\'' && last == b'\'') {
            return &trimmed[1..trimmed.len() - 1];
        }
    }

    trimmed
}

fn decode_percent_hex(value: u8) -> Option<u8> {
    match value {
        b'0'..=b'9' => Some(value - b'0'),
        b'a'..=b'f' => Some(value - b'a' + 10),
        b'A'..=b'F' => Some(value - b'A' + 10),
        _ => None,
    }
}

fn decode_percent_encoded_path(value: &str) -> Option<String> {
    let bytes = value.as_bytes();
    let mut decoded = Vec::with_capacity(bytes.len());
    let mut index = 0usize;

    while index < bytes.len() {
        if bytes[index] == b'%' {
            if index + 2 >= bytes.len() {
                return None;
            }

            let high = decode_percent_hex(bytes[index + 1])?;
            let low = decode_percent_hex(bytes[index + 2])?;
            decoded.push((high << 4) | low);
            index += 3;
            continue;
        }

        decoded.push(bytes[index]);
        index += 1;
    }

    String::from_utf8(decoded).ok()
}

fn parse_file_url_to_path(value: &str) -> Option<PathBuf> {
    let remainder = value.strip_prefix("file://")?;
    let path_part = remainder.split(['?', '#']).next()?.trim();
    if path_part.is_empty() {
        return None;
    }

    let without_host = if let Some(local_path) = path_part.strip_prefix("localhost/") {
        format!("/{local_path}")
    } else if path_part.eq_ignore_ascii_case("localhost") {
        return None;
    } else {
        path_part.to_string()
    };

    let decoded = decode_percent_encoded_path(&without_host)?;

    #[cfg(windows)]
    let decoded = if decoded.starts_with('/') && decoded.as_bytes().get(2) == Some(&b':') {
        decoded[1..].to_string()
    } else {
        decoded
    };

    Some(PathBuf::from(decoded))
}

fn normalize_associated_book_path(file_path: &str, cwd: Option<&Path>) -> Option<PathBuf> {
    let trimmed = strip_wrapping_quotes(file_path);
    if trimmed.is_empty() {
        return None;
    }

    let path = parse_file_url_to_path(trimmed).unwrap_or_else(|| PathBuf::from(trimmed));
    let resolved = if path.is_absolute() {
        path
    } else if let Some(cwd) = cwd {
        cwd.join(path)
    } else {
        path
    };
    let canonical = fs::canonicalize(&resolved).ok()?;

    if !canonical.is_file() || !is_supported_associated_book_path(&canonical) {
        return None;
    }

    Some(canonical)
}

fn normalize_associated_book_requests(
    file_paths: Vec<String>,
    cwd: Option<&Path>,
) -> Vec<AssociatedBookOpenRequest> {
    let mut seen_paths = HashSet::new();

    file_paths
        .into_iter()
        .filter_map(|file_path| {
            let resolved = normalize_associated_book_path(&file_path, cwd)?;
            let normalized_path = resolved.to_string_lossy().to_string();
            if !seen_paths.insert(normalized_path.clone()) {
                return None;
            }

            let label = resolved
                .file_name()
                .and_then(|value| value.to_str())
                .filter(|value| !value.trim().is_empty())
                .unwrap_or("Associated book")
                .to_string();

            Some(AssociatedBookOpenRequest {
                path: normalized_path,
                label,
            })
        })
        .collect()
}

pub(crate) fn queue_associated_book_open_requests_runtime<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    file_paths: Vec<String>,
    cwd: Option<PathBuf>,
) -> Result<usize, String> {
    let requests = normalize_associated_book_requests(file_paths, cwd.as_deref());
    if requests.is_empty() {
        return Ok(0);
    }

    register_trusted_associated_book_paths(app, &requests)?;

    let pending = app.state::<PendingAssociatedBookOpenRequests>();
    let mut queue = pending
        .0
        .lock()
        .map_err(|_| "Failed to lock associated-book queue".to_string())?;
    queue.extend(requests);
    let queued_count = queue.len();
    drop(queue);

    let _ = app.emit_to("main", ASSOCIATED_BOOK_OPEN_EVENT, ());
    Ok(queued_count)
}

fn author_looks_like_placeholder(value: &str) -> bool {
    let trimmed = value.trim();
    trimmed.is_empty()
        || matches!(
            trimmed,
            "Unknown author"
                | "Reader workspace"
                | "Preparing book"
                | "Open failed"
                | "未知作者"
                | "阅读工作区"
                | "正在准备书籍"
                | "打开失败"
        )
}

fn decorate_library_record_file_state(record: &mut LibraryBookRecord) {
    record.library_file_exists = Some(Path::new(&record.file_path).is_file());
    record.source_file_exists = record
        .source_path
        .as_ref()
        .map(|source_path| Path::new(source_path).is_file());
}

fn decorate_library_record_file_states(records: &mut [LibraryBookRecord]) {
    for record in records {
        decorate_library_record_file_state(record);
    }
}

#[derive(Default)]
struct Fb2Metadata {
    title: Option<String>,
    author: Option<String>,
    language: Option<String>,
    description: Option<String>,
    publisher: Option<String>,
}

#[derive(Default)]
struct CbzMetadata {
    title: Option<String>,
    author: Option<String>,
    language: Option<String>,
    description: Option<String>,
    publisher: Option<String>,
}

#[cfg(feature = "webdriver")]
#[derive(Debug, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct LibraryTrustBoundaryProbe {
    import_error: Option<String>,
    book_binary_error: Option<String>,
    fingerprint_error: Option<String>,
    cover_error: Option<String>,
    repair_preview_error: Option<String>,
    restore_error: Option<String>,
}

fn derive_cbz_cover_asset(source: &Path) -> Option<(String, Vec<u8>)> {
    let file = fs::File::open(source).ok()?;
    let mut archive = ZipArchive::new(file).ok()?;

    let pick_index = (0..archive.len())
        .find(|index| {
            let Ok(entry) = archive.by_index(*index) else {
                return false;
            };
            let name = entry.name().to_ascii_lowercase();
            if name.ends_with("comicinfo.xml") {
                return false;
            }
            let is_image = name.ends_with(".svg")
                || name.ends_with(".png")
                || name.ends_with(".jpg")
                || name.ends_with(".jpeg")
                || name.ends_with(".webp");
            if !is_image {
                return false;
            }
            name.contains("cover") || name.contains("front")
        })
        .or_else(|| {
            (0..archive.len()).find(|index| {
                let Ok(entry) = archive.by_index(*index) else {
                    return false;
                };
                let name = entry.name().to_ascii_lowercase();
                name.ends_with(".svg")
                    || name.ends_with(".png")
                    || name.ends_with(".jpg")
                    || name.ends_with(".jpeg")
                    || name.ends_with(".webp")
            })
        })?;

    let mut entry = archive.by_index(pick_index).ok()?;
    let entry_name = entry.name().to_string();
    let entry_name = Path::new(&entry_name)
        .file_name()
        .and_then(|value| value.to_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("cover");
    let mut bytes = Vec::new();
    entry.read_to_end(&mut bytes).ok()?;
    Some((entry_name.to_string(), bytes))
}

fn derive_fb2_metadata(source: &Path) -> Fb2Metadata {
    let Ok(raw) = fs::read_to_string(source) else {
        return Fb2Metadata::default();
    };
    let mut reader = Reader::from_str(&raw);
    reader.config_mut().trim_text(true);

    let mut in_title_info = false;
    let mut in_author = false;
    let mut in_annotation = false;
    let mut in_annotation_paragraph = false;
    let mut in_publish_info = false;
    let mut in_book_title = false;
    let mut in_lang = false;
    let mut in_publisher = false;
    let mut current_field: Option<&'static str> = None;
    let mut first_name = String::new();
    let mut last_name = String::new();
    let mut nickname = String::new();
    let mut annotation_paragraphs: Vec<String> = Vec::new();
    let mut metadata = Fb2Metadata::default();

    loop {
        match reader.read_event() {
            Ok(Event::Start(event)) => match event.name() {
                QName(b"title-info") => in_title_info = true,
                QName(b"publish-info") => in_publish_info = true,
                QName(b"author") if in_title_info && !in_author => in_author = true,
                QName(b"first-name") if in_author => current_field = Some("first"),
                QName(b"last-name") if in_author => current_field = Some("last"),
                QName(b"nickname") if in_author => current_field = Some("nickname"),
                QName(b"annotation") if in_title_info => in_annotation = true,
                QName(b"p") if in_annotation => in_annotation_paragraph = true,
                QName(b"book-title") if in_title_info => in_book_title = true,
                QName(b"lang") if in_title_info => in_lang = true,
                QName(b"publisher") if in_publish_info => in_publisher = true,
                _ => {}
            },
            Ok(Event::End(event)) => match event.name() {
                QName(b"author") if in_author => {
                    let full_name = [first_name.trim(), last_name.trim()]
                        .into_iter()
                        .filter(|value| !value.is_empty())
                        .collect::<Vec<_>>()
                        .join(" ");
                    if !full_name.is_empty() {
                        metadata.author = Some(full_name);
                    } else {
                        let fallback = nickname.trim();
                        if !fallback.is_empty() {
                            metadata.author = Some(fallback.to_string());
                        }
                    }
                    in_author = false;
                }
                QName(b"title-info") if in_title_info => in_title_info = false,
                QName(b"publish-info") if in_publish_info => in_publish_info = false,
                QName(b"first-name") | QName(b"last-name") | QName(b"nickname") => {
                    current_field = None
                }
                QName(b"annotation") if in_annotation => in_annotation = false,
                QName(b"p") if in_annotation_paragraph => in_annotation_paragraph = false,
                QName(b"book-title") if in_book_title => in_book_title = false,
                QName(b"lang") if in_lang => in_lang = false,
                QName(b"publisher") if in_publisher => in_publisher = false,
                _ => {}
            },
            Ok(Event::Text(text)) => {
                let value = String::from_utf8_lossy(text.as_ref()).trim().to_string();
                if value.is_empty() {
                    continue;
                }

                if in_author {
                    match current_field {
                        Some("first") if first_name.is_empty() => first_name = value,
                        Some("last") if last_name.is_empty() => last_name = value,
                        Some("nickname") if nickname.is_empty() => nickname = value,
                        _ => {}
                    }
                    continue;
                }

                if in_annotation_paragraph {
                    annotation_paragraphs.push(value);
                    continue;
                }

                if in_book_title && metadata.title.is_none() {
                    metadata.title = Some(value);
                    continue;
                }

                if in_lang && metadata.language.is_none() {
                    metadata.language = Some(value);
                    continue;
                }

                if in_publisher && metadata.publisher.is_none() {
                    metadata.publisher = Some(value);
                }
            }
            Ok(Event::Eof) => break,
            Ok(_) => {}
            Err(_) => return Fb2Metadata::default(),
        }
    }

    if metadata.description.is_none() {
        let description = annotation_paragraphs
            .into_iter()
            .map(|paragraph| paragraph.trim().to_string())
            .filter(|paragraph| !paragraph.is_empty())
            .collect::<Vec<_>>()
            .join("\n\n");
        if !description.is_empty() {
            metadata.description = Some(description);
        }
    }

    metadata
}

fn derive_cbz_metadata(source: &Path) -> CbzMetadata {
    let Ok(file) = fs::File::open(source) else {
        return CbzMetadata::default();
    };
    let Ok(mut archive) = ZipArchive::new(file) else {
        return CbzMetadata::default();
    };

    let comic_info_name = (0..archive.len()).find_map(|index| {
        let Ok(entry) = archive.by_index(index) else {
            return None;
        };
        let name = entry.name().to_string();
        name.to_ascii_lowercase()
            .ends_with("comicinfo.xml")
            .then_some(name)
    });

    let Some(comic_info_name) = comic_info_name else {
        return CbzMetadata::default();
    };

    let Ok(mut comic_info) = archive.by_name(&comic_info_name) else {
        return CbzMetadata::default();
    };
    let mut raw = String::new();
    if comic_info.read_to_string(&mut raw).is_err() {
        return CbzMetadata::default();
    }

    let mut reader = Reader::from_str(&raw);
    reader.config_mut().trim_text(true);
    let mut current_field: Option<&'static str> = None;
    let mut metadata = CbzMetadata::default();

    loop {
        match reader.read_event() {
            Ok(Event::Start(event)) => match event.name() {
                QName(b"Title") => current_field = Some("title"),
                QName(b"Writer") => current_field = Some("author"),
                QName(b"LanguageISO") => current_field = Some("language"),
                QName(b"Summary") => current_field = Some("description"),
                QName(b"Publisher") => current_field = Some("publisher"),
                _ => {}
            },
            Ok(Event::End(event)) => match event.name() {
                QName(b"Title")
                | QName(b"Writer")
                | QName(b"LanguageISO")
                | QName(b"Summary")
                | QName(b"Publisher") => current_field = None,
                _ => {}
            },
            Ok(Event::Text(text)) => {
                let value = String::from_utf8_lossy(text.as_ref()).trim().to_string();
                if value.is_empty() {
                    continue;
                }
                match current_field {
                    Some("title") if metadata.title.is_none() => metadata.title = Some(value),
                    Some("author") if metadata.author.is_none() => metadata.author = Some(value),
                    Some("language") if metadata.language.is_none() => {
                        metadata.language = Some(value)
                    }
                    Some("description") if metadata.description.is_none() => {
                        metadata.description = Some(value)
                    }
                    Some("publisher") if metadata.publisher.is_none() => {
                        metadata.publisher = Some(value)
                    }
                    _ => {}
                }
            }
            Ok(Event::Eof) => break,
            Ok(_) => {}
            Err(_) => return CbzMetadata::default(),
        }
    }

    metadata
}

#[derive(Default)]
struct KindleMetadata {
    title: Option<String>,
    author: Option<String>,
    publisher: Option<String>,
    description: Option<String>,
    language: Option<String>,
}

fn decode_kindle_text(value: &[u8]) -> Option<String> {
    let utf8 = String::from_utf8_lossy(value)
        .trim_matches(char::from(0))
        .trim()
        .to_string();
    if !utf8.is_empty() {
        return Some(utf8);
    }

    let latin1 = value
        .iter()
        .map(|byte| char::from(*byte))
        .collect::<String>()
        .trim_matches(char::from(0))
        .trim()
        .to_string();
    (!latin1.is_empty()).then_some(latin1)
}

fn derive_kindle_metadata(source: &Path) -> KindleMetadata {
    let bytes = match fs::read(source) {
        Ok(bytes) => bytes,
        Err(_) => return KindleMetadata::default(),
    };

    if bytes.len() < 128 {
        return KindleMetadata::default();
    }

    let palm_doc_header_len = u16::from_be_bytes([bytes[76], bytes[77]]) as usize;
    let mobi_base = palm_doc_header_len + 16;
    if bytes.len() < mobi_base + 116 {
        return KindleMetadata::default();
    }

    let exth_flags = u32::from_be_bytes([
        bytes[mobi_base + 112],
        bytes[mobi_base + 113],
        bytes[mobi_base + 114],
        bytes[mobi_base + 115],
    ]);
    let search_end = bytes.len().min(mobi_base.saturating_add(65_536));
    let exth_offset = bytes[mobi_base..search_end]
        .windows(4)
        .position(|window| window == b"EXTH")
        .map(|offset| mobi_base + offset);
    let Some(exth_offset) = exth_offset else {
        return KindleMetadata::default();
    };
    if exth_flags & 0x40 == 0 {
        // Some legacy MOBI files still carry a valid EXTH block without setting the
        // dedicated flag bit. If we can see the marker in-bounds, trust the data.
    }
    if bytes.len() < exth_offset + 12 {
        return KindleMetadata::default();
    }

    let record_count = u32::from_be_bytes([
        bytes[exth_offset + 8],
        bytes[exth_offset + 9],
        bytes[exth_offset + 10],
        bytes[exth_offset + 11],
    ]) as usize;
    let mut cursor = exth_offset + 12;
    let mut metadata = KindleMetadata::default();

    for _ in 0..record_count {
        if bytes.len() < cursor + 8 {
            break;
        }
        let record_type = u32::from_be_bytes([
            bytes[cursor],
            bytes[cursor + 1],
            bytes[cursor + 2],
            bytes[cursor + 3],
        ]);
        let record_len = u32::from_be_bytes([
            bytes[cursor + 4],
            bytes[cursor + 5],
            bytes[cursor + 6],
            bytes[cursor + 7],
        ]) as usize;
        if record_len < 8 || bytes.len() < cursor + record_len {
            break;
        }

        let payload = &bytes[cursor + 8..cursor + record_len];
        let decoded = decode_kindle_text(payload);
        match record_type {
            100 if metadata.author.is_none() => metadata.author = decoded,
            101 if metadata.publisher.is_none() => metadata.publisher = decoded,
            103 if metadata.description.is_none() => metadata.description = decoded,
            503 if metadata.title.is_none() => metadata.title = decoded,
            524 if metadata.language.is_none() => metadata.language = decoded,
            _ => {}
        }
        cursor += record_len;
    }

    metadata
}

fn derive_library_title(record: &LibraryBookRecord, incoming_title: &str) -> String {
    let trimmed = incoming_title.trim();
    let source_stem = record
        .source_path
        .as_ref()
        .and_then(|source_path| {
            Path::new(source_path)
                .file_stem()
                .and_then(|stem| stem.to_str())
        })
        .map(|stem| stem.trim().to_string())
        .filter(|stem| !stem.is_empty());

    if trimmed.is_empty() || title_looks_like_stored_filename(trimmed) {
        if let Some(source_stem) = source_stem {
            return source_stem;
        }

        return record.title.clone();
    }

    if let Some(source_stem) = source_stem.as_ref() {
        if normalize_status_key(trimmed) == normalize_status_key(source_stem)
            && normalize_status_key(&record.title) != normalize_status_key(source_stem)
        {
            return record.title.clone();
        }
    }

    trimmed.to_string()
}

fn normalized_path_stem_key(path: &Path) -> String {
    path.file_stem()
        .and_then(|stem| stem.to_str())
        .map(normalize_status_key)
        .unwrap_or_default()
}

fn record_needs_repair(record: &LibraryBookRecord) -> bool {
    !Path::new(&record.file_path).is_file()
        || record
            .source_path
            .as_ref()
            .map(|source_path| !Path::new(source_path).is_file())
            .unwrap_or(false)
}

fn titles_match_for_repair(
    record: &LibraryBookRecord,
    incoming_title: &str,
    incoming_source: &Path,
) -> bool {
    let incoming_title_key = normalize_status_key(incoming_title);
    let incoming_stem_key = normalized_path_stem_key(incoming_source);
    let record_title_key = normalize_status_key(&record.title);
    let record_source_key = record
        .source_path
        .as_ref()
        .map(|source_path| normalized_path_stem_key(Path::new(source_path)))
        .unwrap_or_default();
    let record_library_key = normalized_path_stem_key(Path::new(&record.file_path));

    [incoming_title_key, incoming_stem_key]
        .into_iter()
        .filter(|value| !value.is_empty())
        .any(|incoming_key| {
            [
                record_title_key.as_str(),
                record_source_key.as_str(),
                record_library_key.as_str(),
            ]
            .into_iter()
            .any(|record_key| !record_key.is_empty() && record_key == incoming_key)
        })
}

fn authors_match_for_repair(record: &LibraryBookRecord, incoming_author: &str) -> bool {
    if author_looks_like_placeholder(incoming_author)
        || author_looks_like_placeholder(&record.author)
    {
        return true;
    }

    let incoming_author_key = normalize_status_key(incoming_author);
    let record_author_key = normalize_status_key(&record.author);
    incoming_author_key.is_empty()
        || record_author_key.is_empty()
        || incoming_author_key == record_author_key
}

fn find_repairable_library_record_index(
    records: &[LibraryBookRecord],
    incoming_source_path: &str,
    incoming_source: &Path,
    incoming_title: &str,
    incoming_author: &str,
    incoming_format: &str,
) -> Option<usize> {
    records.iter().position(|record| {
        if record.id.starts_with("readest-") {
            return false;
        }

        if record.source_path.as_deref() == Some(incoming_source_path) {
            return true;
        }

        if !record_needs_repair(record) {
            return false;
        }

        if !record.format.trim().eq_ignore_ascii_case(incoming_format) {
            return false;
        }

        titles_match_for_repair(record, incoming_title, incoming_source)
            && authors_match_for_repair(record, incoming_author)
    })
}

fn derive_import_metadata_for_source(source: &Path, extension: &str) -> (String, String) {
    let default_title = source
        .file_stem()
        .and_then(|stem| stem.to_str())
        .unwrap_or("Imported book")
        .to_string();
    let fb2_metadata = if extension == "fb2" {
        derive_fb2_metadata(source)
    } else {
        Fb2Metadata::default()
    };
    let cbz_metadata = if extension == "cbz" {
        derive_cbz_metadata(source)
    } else {
        CbzMetadata::default()
    };
    let kindle_metadata = if extension == "mobi" || extension == "azw3" {
        derive_kindle_metadata(source)
    } else {
        KindleMetadata::default()
    };

    let title = if extension == "fb2" {
        fb2_metadata.title.clone().unwrap_or(default_title.clone())
    } else if extension == "cbz" {
        cbz_metadata.title.clone().unwrap_or(default_title.clone())
    } else {
        kindle_metadata
            .title
            .clone()
            .unwrap_or(default_title.clone())
    };
    let author = if extension == "fb2" {
        fb2_metadata
            .author
            .clone()
            .unwrap_or_else(|| "Unknown author".to_string())
    } else if extension == "cbz" {
        cbz_metadata
            .author
            .clone()
            .unwrap_or_else(|| "Unknown author".to_string())
    } else if let Some(author) = kindle_metadata.author.clone() {
        author
    } else {
        "Unknown author".to_string()
    };

    (title, author)
}

fn sha256_file(path: &Path) -> Option<String> {
    let mut file = fs::File::open(path).ok()?;
    let mut hasher = Sha256::new();
    let mut buffer = [0u8; 8192];

    loop {
        let bytes_read = file.read(&mut buffer).ok()?;
        if bytes_read == 0 {
            break;
        }
        hasher.update(&buffer[..bytes_read]);
    }

    Some(format!("{:x}", hasher.finalize()))
}

fn choose_repaired_title(
    existing_record: &LibraryBookRecord,
    incoming_title: &str,
    default_title: &str,
) -> String {
    let trimmed_incoming = incoming_title.trim();
    if !trimmed_incoming.is_empty() && !title_looks_like_stored_filename(trimmed_incoming) {
        return trimmed_incoming.to_string();
    }

    let trimmed_existing = existing_record.title.trim();
    if !trimmed_existing.is_empty() && !title_looks_like_stored_filename(trimmed_existing) {
        return trimmed_existing.to_string();
    }

    let trimmed_default = default_title.trim();
    if !trimmed_default.is_empty() {
        return trimmed_default.to_string();
    }

    existing_record.title.clone()
}

fn choose_repaired_author(existing_record: &LibraryBookRecord, incoming_author: &str) -> String {
    if !author_looks_like_placeholder(incoming_author) {
        return incoming_author.trim().to_string();
    }

    existing_record.author.clone()
}

fn choose_repaired_optional(
    existing_value: Option<String>,
    incoming_value: Option<String>,
) -> Option<String> {
    let incoming_value = incoming_value.and_then(|value| {
        let trimmed = value.trim();
        (!trimmed.is_empty()).then(|| trimmed.to_string())
    });
    if incoming_value.is_some() {
        return incoming_value;
    }

    existing_value.and_then(|value| {
        let trimmed = value.trim();
        (!trimmed.is_empty()).then(|| trimmed.to_string())
    })
}

fn normalize_library_tags(tags: Option<Vec<String>>) -> Vec<String> {
    let mut normalized = Vec::new();
    for tag in tags.unwrap_or_default() {
        let trimmed = tag.trim();
        if trimmed.is_empty() || normalized.iter().any(|value: &String| value == trimmed) {
            continue;
        }
        normalized.push(trimmed.to_string());
    }
    normalized
}

fn cleanup_repaired_record_assets(
    existing_record: &LibraryBookRecord,
    next_file_path: &Path,
    next_cover_path: Option<&str>,
) {
    let existing_file_path = Path::new(&existing_record.file_path);
    if existing_file_path != next_file_path && existing_file_path.is_file() {
        let _ = fs::remove_file(existing_file_path);
    }

    if let Some(existing_cover_path) = existing_record.cover_path.as_deref() {
        let should_keep_existing_cover = next_cover_path == Some(existing_cover_path);
        let existing_cover_path = Path::new(existing_cover_path);
        if !should_keep_existing_cover && existing_cover_path.is_file() {
            let _ = fs::remove_file(existing_cover_path);
        }
    }
}

fn remove_library_owned_file(file_path: &str, library_root: &Path) -> Result<(), String> {
    let path = Path::new(file_path);
    if !path.starts_with(library_root) {
        return Ok(());
    }

    match fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

fn remove_empty_library_directory(path: &Path, library_root: &Path) {
    if !path.starts_with(library_root) || path == library_root {
        return;
    }

    match fs::remove_dir(path) {
        Ok(()) => {}
        Err(error)
            if error.kind() == ErrorKind::NotFound
                || error.kind() == ErrorKind::DirectoryNotEmpty => {}
        Err(_) => {}
    }
}

fn status_looks_like_internal_asset(value: &str) -> bool {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return true;
    }

    let lower = trimmed.to_ascii_lowercase();
    lower.ends_with(".svg")
        || lower.ends_with(".jpg")
        || lower.ends_with(".jpeg")
        || lower.ends_with(".png")
        || lower.ends_with(".webp")
}

fn normalize_status_key(value: &str) -> String {
    value
        .chars()
        .filter(|character| character.is_alphanumeric())
        .flat_map(|character| character.to_lowercase())
        .collect()
}

fn status_looks_like_title(chapter_label: &str, title: &str) -> bool {
    let chapter_key = normalize_status_key(chapter_label);
    let title_key = normalize_status_key(title);
    !chapter_key.is_empty() && chapter_key == title_key
}

fn derive_library_status(progress_fraction: f64, chapter_label: &str, title: &str) -> String {
    if progress_fraction <= 0.0 {
        return "已打开".to_string();
    }

    if status_looks_like_internal_asset(chapter_label)
        || status_looks_like_title(chapter_label, title)
    {
        return "继续阅读".to_string();
    }

    chapter_label.trim().to_string()
}

#[tauri::command]
pub(crate) fn load_library_books(app: tauri::AppHandle) -> Result<Vec<LibraryBookRecord>, String> {
    let library_json = library_json_path(&app)?;
    let mut records = load_library_records(&library_json)?;
    if normalize_library_records(&mut records) {
        save_library_records(&library_json, &records)?;
    }
    decorate_library_record_file_states(&mut records);
    Ok(records)
}

#[tauri::command]
#[cfg(feature = "webdriver")]
pub(crate) fn queue_associated_book_open_requests(
    app: tauri::AppHandle,
    file_paths: Vec<String>,
) -> Result<usize, String> {
    queue_associated_book_open_requests_runtime(&app, file_paths, None)
}

#[tauri::command]
#[cfg(feature = "webdriver")]
pub(crate) fn trust_library_import_paths_for_webdriver(
    app: tauri::AppHandle,
    file_paths: Vec<String>,
) -> Result<Vec<String>, String> {
    let mut trusted_paths = Vec::new();
    for file_path in file_paths {
        let trusted_path = normalize_selected_library_book_path(PathBuf::from(file_path))?;
        register_trusted_library_import_path(&app, &trusted_path)?;
        trusted_paths.push(trusted_path.to_string_lossy().to_string());
    }
    Ok(trusted_paths)
}

#[tauri::command]
#[cfg(feature = "webdriver")]
pub(crate) fn probe_untrusted_library_paths_for_webdriver(
    app: tauri::AppHandle,
    book_path: String,
    cover_path: String,
    record_id: String,
) -> Result<LibraryTrustBoundaryProbe, String> {
    let library_json = library_json_path(&app)?;
    let records = load_library_records(&library_json)?;
    let import_error = resolve_trusted_import_source_path(&app, &records, &book_path).err();
    let book_binary_error = resolve_trusted_library_book_path(&app, &book_path).err();
    let fingerprint_error = resolve_trusted_library_book_path(&app, &book_path).err();
    let cover_error = resolve_library_owned_cover_path(&app, &cover_path).err();
    let repair_preview_error = (|| {
        find_persisted_library_record(&records, &record_id)
            .ok_or_else(|| "Library record not found for repair preview".to_string())?;
        resolve_trusted_import_source_path(&app, &records, &book_path)?;
        Ok::<(), String>(())
    })()
    .err();
    let restore_error = get_removed_library_record(&app, &book_path)?
        .or_else(|| find_persisted_library_record(&records, &book_path))
        .map(|_| ())
        .ok_or_else(|| "Library record not found for restore".to_string())
        .err();

    Ok(LibraryTrustBoundaryProbe {
        import_error,
        book_binary_error,
        fingerprint_error,
        cover_error,
        repair_preview_error,
        restore_error,
    })
}

#[tauri::command]
pub(crate) fn consume_associated_book_open_requests(
    app: tauri::AppHandle,
) -> Result<Vec<AssociatedBookOpenRequest>, String> {
    let pending = app.state::<PendingAssociatedBookOpenRequests>();
    let mut queue = pending
        .0
        .lock()
        .map_err(|_| "Failed to lock associated-book queue".to_string())?;
    let requests = std::mem::take(&mut *queue);
    Ok(requests)
}

#[tauri::command]
pub(crate) fn detect_readest_library(
    app: tauri::AppHandle,
) -> Result<ReadestLibrarySummary, String> {
    let readest_library = readest_library_json_path(&app)?;
    if !readest_library.exists() {
        return Ok(ReadestLibrarySummary {
            available: false,
            count: 0,
        });
    }

    let books = load_readest_records(&readest_library)?;
    Ok(ReadestLibrarySummary {
        available: !books.is_empty(),
        count: books.len(),
    })
}

#[tauri::command]
pub(crate) async fn select_library_book_paths(
    app: tauri::AppHandle,
) -> Result<Vec<String>, String> {
    let picker_app = app.clone();
    let selected = tauri::async_runtime::spawn_blocking(move || {
        picker_app
            .dialog()
            .file()
            .add_filter("Books", SUPPORTED_BOOK_DIALOG_EXTENSIONS)
            .blocking_pick_files()
    })
    .await
    .map_err(|error| error.to_string())?;

    let Some(selected) = selected else {
        return Ok(Vec::new());
    };

    let paths = selected
        .into_iter()
        .map(resolve_dialog_file_path)
        .map(|result| result.and_then(normalize_selected_library_book_path))
        .collect::<Result<Vec<_>, _>>()?;
    register_trusted_library_import_paths(&app, &paths)?;

    Ok(paths
        .into_iter()
        .map(|path| path.to_string_lossy().to_string())
        .collect())
}

#[tauri::command]
pub(crate) async fn select_single_library_book_path(
    app: tauri::AppHandle,
) -> Result<Option<String>, String> {
    let picker_app = app.clone();
    let selected = tauri::async_runtime::spawn_blocking(move || {
        picker_app
            .dialog()
            .file()
            .add_filter("Books", SUPPORTED_BOOK_DIALOG_EXTENSIONS)
            .blocking_pick_file()
    })
    .await
    .map_err(|error| error.to_string())?;

    let Some(selected) = selected else {
        return Ok(None);
    };

    let path = normalize_selected_library_book_path(resolve_dialog_file_path(selected)?)?;
    register_trusted_library_import_path(&app, &path)?;

    Ok(Some(path.to_string_lossy().to_string()))
}

#[tauri::command]
pub(crate) fn import_library_books(
    app: tauri::AppHandle,
    file_paths: Vec<String>,
) -> Result<Vec<LibraryBookRecord>, String> {
    let library_root = ensure_library_root(&app)?;
    let books_dir = library_root.join("books");
    fs::create_dir_all(&books_dir).map_err(|error| error.to_string())?;
    let library_json = library_root.join("library.json");
    let mut records = load_library_records(&library_json)?;
    decorate_library_record_file_states(&mut records);
    let mut imported = Vec::new();

    for file_path in file_paths {
        let source = resolve_trusted_import_source_path(&app, &records, &file_path)?;
        let file_path = source.to_string_lossy().to_string();
        let filename = source
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(|| "Invalid file path".to_string())?
            .to_string();
        let extension = source
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_lowercase();
        let default_title = source
            .file_stem()
            .and_then(|stem| stem.to_str())
            .unwrap_or("Imported book")
            .to_string();
        let fb2_metadata = if extension == "fb2" {
            derive_fb2_metadata(&source)
        } else {
            Fb2Metadata::default()
        };
        let cbz_metadata = if extension == "cbz" {
            derive_cbz_metadata(&source)
        } else {
            CbzMetadata::default()
        };
        let kindle_metadata = if extension == "mobi" || extension == "azw3" {
            derive_kindle_metadata(&source)
        } else {
            KindleMetadata::default()
        };
        let title = if extension == "fb2" {
            fb2_metadata.title.clone().unwrap_or(default_title.clone())
        } else if extension == "cbz" {
            cbz_metadata.title.clone().unwrap_or(default_title.clone())
        } else {
            kindle_metadata
                .title
                .clone()
                .unwrap_or(default_title.clone())
        };
        let author = if extension == "fb2" {
            fb2_metadata
                .author
                .clone()
                .unwrap_or_else(|| "Unknown author".to_string())
        } else if extension == "cbz" {
            cbz_metadata
                .author
                .clone()
                .unwrap_or_else(|| "Unknown author".to_string())
        } else if let Some(author) = kindle_metadata.author.clone() {
            author
        } else {
            "Unknown author".to_string()
        };
        let language = if extension == "fb2" {
            fb2_metadata.language.clone()
        } else if extension == "cbz" {
            cbz_metadata.language.clone()
        } else {
            kindle_metadata.language.clone()
        };
        let publisher = if extension == "fb2" {
            fb2_metadata.publisher.clone()
        } else if extension == "cbz" {
            cbz_metadata.publisher.clone()
        } else if extension == "mobi" || extension == "azw3" {
            kindle_metadata.publisher.clone()
        } else {
            None
        };
        let description = if extension == "fb2" {
            fb2_metadata.description.clone()
        } else if extension == "cbz" {
            cbz_metadata.description.clone()
        } else if extension == "mobi" || extension == "azw3" {
            kindle_metadata.description.clone()
        } else {
            None
        };
        let bytes = fs::read(&source).map_err(|error| error.to_string())?;
        let format = if extension.is_empty() {
            "BOOK".to_string()
        } else {
            extension.to_uppercase()
        };
        let repair_index = find_repairable_library_record_index(
            &records, &file_path, &source, &title, &author, &format,
        );
        let existing_record = repair_index.map(|index| records[index].clone());
        let imported_at = existing_record
            .as_ref()
            .map(|record| record.imported_at)
            .unwrap_or(now_millis()?);
        let id = existing_record
            .as_ref()
            .map(|record| record.id.clone())
            .unwrap_or_else(|| imported_at.to_string());
        let safe_filename = sanitize_filename(&filename);
        let stored_filename = format!("{id}-{safe_filename}");
        let stored_path = books_dir.join(stored_filename);

        fs::write(&stored_path, bytes).map_err(|error| error.to_string())?;
        let cbz_cover_path = if extension == "cbz" {
            derive_cbz_cover_asset(&source).and_then(|(entry_name, cover_bytes)| {
                let cover_name = format!("{id}-{}", sanitize_filename(&entry_name));
                let path = books_dir.join(cover_name);
                fs::write(&path, cover_bytes).ok()?;
                Some(path.to_string_lossy().to_string())
            })
        } else {
            existing_record
                .as_ref()
                .and_then(|record| record.cover_path.clone())
                .filter(|cover_path| Path::new(cover_path).is_file())
        };

        let record = LibraryBookRecord {
            id,
            title: existing_record
                .as_ref()
                .map(|record| choose_repaired_title(record, &title, &default_title))
                .unwrap_or(title),
            author: existing_record
                .as_ref()
                .map(|record| choose_repaired_author(record, &author))
                .unwrap_or(author),
            format,
            description: existing_record
                .as_ref()
                .map(|record| {
                    choose_repaired_optional(record.description.clone(), description.clone())
                })
                .unwrap_or(description),
            language: existing_record
                .as_ref()
                .map(|record| choose_repaired_optional(record.language.clone(), language.clone()))
                .unwrap_or(language),
            publisher: existing_record
                .as_ref()
                .map(|record| choose_repaired_optional(record.publisher.clone(), publisher.clone()))
                .unwrap_or(publisher),
            collection: existing_record
                .as_ref()
                .and_then(|record| record.collection.clone()),
            tags: existing_record
                .as_ref()
                .map(|record| record.tags.clone())
                .unwrap_or_default(),
            progress: existing_record
                .as_ref()
                .map(|record| record.progress.clone())
                .unwrap_or_else(|| "等待首轮阅读".to_string()),
            status: existing_record
                .as_ref()
                .map(|record| record.status.clone())
                .unwrap_or_else(|| "新导入".to_string()),
            file_path: stored_path.to_string_lossy().to_string(),
            cover_path: cbz_cover_path.clone(),
            source_path: Some(file_path.clone()),
            imported_at,
            progress_fraction: existing_record
                .as_ref()
                .and_then(|record| record.progress_fraction),
            progress_location: existing_record
                .as_ref()
                .and_then(|record| record.progress_location.clone()),
            last_opened_at: existing_record
                .as_ref()
                .and_then(|record| record.last_opened_at),
            library_file_exists: None,
            source_file_exists: None,
        };

        if let Some(existing_record) = existing_record.as_ref() {
            cleanup_repaired_record_assets(
                existing_record,
                &stored_path,
                cbz_cover_path.as_deref(),
            );
        }

        records.retain(|book| {
            if let Some(existing_record) = existing_record.as_ref() {
                book.id != existing_record.id
            } else {
                book.source_path.as_deref() != Some(file_path.as_str())
            }
        });
        records.insert(0, record.clone());
        imported.push(record);
    }

    save_library_records(&library_json, &records)?;
    decorate_library_record_file_states(&mut imported);

    Ok(imported)
}

#[tauri::command]
pub(crate) fn remove_library_book(
    app: tauri::AppHandle,
    file_path: String,
) -> Result<Vec<LibraryBookRecord>, String> {
    let library_root = ensure_library_root(&app)?;
    let library_json = library_root.join("library.json");
    let mut records = load_library_records(&library_json)?;
    let Some(remove_index) = records
        .iter()
        .position(|record| record.file_path == file_path || record.id == file_path)
    else {
        decorate_library_record_file_states(&mut records);
        return Ok(records);
    };

    let removed_record = records.remove(remove_index);
    remove_library_owned_file(&removed_record.file_path, &library_root)?;
    if let Some(cover_path) = removed_record.cover_path.as_deref() {
        remove_library_owned_file(cover_path, &library_root)?;
    }

    if let Some(parent) = Path::new(&removed_record.file_path).parent() {
        remove_empty_library_directory(parent, &library_root);
    }

    remember_removed_library_record(&app, removed_record)?;
    save_library_records(&library_json, &records)?;
    decorate_library_record_file_states(&mut records);
    Ok(records)
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub(crate) fn update_library_book_metadata(
    app: tauri::AppHandle,
    record_id: String,
    title: String,
    author: String,
    description: Option<String>,
    language: Option<String>,
    publisher: Option<String>,
    collection: Option<String>,
    tags: Option<Vec<String>>,
) -> Result<Vec<LibraryBookRecord>, String> {
    let library_root = ensure_library_root(&app)?;
    let library_json = library_root.join("library.json");
    let mut records = load_library_records(&library_json)?;
    let normalized_title = title.trim();
    let normalized_author = author.trim();
    if normalized_title.is_empty() || normalized_author.is_empty() {
        return Err("Library title and author cannot be empty".to_string());
    }

    let Some(record) = records
        .iter_mut()
        .find(|record| record.id == record_id || record.file_path == record_id)
    else {
        decorate_library_record_file_states(&mut records);
        return Ok(records);
    };

    record.title = normalized_title.to_string();
    record.author = normalized_author.to_string();
    record.description = description.and_then(|value| {
        let trimmed = value.trim().to_string();
        (!trimmed.is_empty()).then_some(trimmed)
    });
    record.language = language.and_then(|value| {
        let trimmed = value.trim().to_string();
        (!trimmed.is_empty()).then_some(trimmed)
    });
    record.publisher = publisher.and_then(|value| {
        let trimmed = value.trim().to_string();
        (!trimmed.is_empty()).then_some(trimmed)
    });
    record.collection = collection.and_then(|value| {
        let trimmed = value.trim().to_string();
        (!trimmed.is_empty()).then_some(trimmed)
    });
    record.tags = normalize_library_tags(tags);
    save_library_records(&library_json, &records)?;
    decorate_library_record_file_states(&mut records);
    Ok(records)
}

#[tauri::command]
pub(crate) fn preview_library_repair_candidate(
    app: tauri::AppHandle,
    file_path: String,
    record_id: String,
) -> Result<LibraryRepairCandidatePreview, String> {
    let library_json = library_json_path(&app)?;
    let records = load_library_records(&library_json)?;
    let expected_record = find_persisted_library_record(&records, &record_id)
        .ok_or_else(|| "Library record not found for repair preview".to_string())?;
    let candidate_path = resolve_trusted_import_source_path(&app, &records, &file_path)?;
    let file_path = candidate_path.to_string_lossy().to_string();
    let file_name = candidate_path
        .file_name()
        .and_then(|value| value.to_str())
        .filter(|value| !value.trim().is_empty())
        .unwrap_or("Selected file")
        .to_string();
    let format = candidate_path
        .extension()
        .and_then(|value| value.to_str())
        .filter(|value| !value.trim().is_empty())
        .map(|value| value.to_ascii_uppercase())
        .unwrap_or_else(|| "BOOK".to_string());
    let extension = candidate_path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    let (title, author) = derive_import_metadata_for_source(&candidate_path, &extension);
    let expected_format = expected_record.format.trim().to_ascii_uppercase();
    let title_matches = normalize_status_key(&title).is_empty()
        || normalize_status_key(&expected_record.title).is_empty()
        || normalize_status_key(&title) == normalize_status_key(&expected_record.title)
        || normalized_path_stem_key(&candidate_path)
            == normalize_status_key(&expected_record.title);
    let author_matches = author_looks_like_placeholder(&author)
        || author_looks_like_placeholder(&expected_record.author)
        || normalize_status_key(&author) == normalize_status_key(&expected_record.author);
    let normalized_candidate = fs::canonicalize(&candidate_path)
        .ok()
        .map(|path| path.to_string_lossy().to_string());
    let normalized_expected = expected_record
        .source_path
        .as_deref()
        .and_then(|path| canonicalize_existing_file_path(path).ok())
        .map(|path| path.to_string_lossy().to_string());
    let file_exists = candidate_path.is_file();
    let byte_size = fs::metadata(&candidate_path)
        .ok()
        .map(|metadata| metadata.len());
    let sha256 = file_exists.then(|| sha256_file(&candidate_path)).flatten();
    let expected_source_sha256 = expected_record
        .source_path
        .as_deref()
        .and_then(|path| canonicalize_existing_file_path(path).ok())
        .and_then(|path| sha256_file(&path));
    let source_hash_matches =
        sha256.is_some() && expected_source_sha256.is_some() && sha256 == expected_source_sha256;

    Ok(LibraryRepairCandidatePreview {
        file_path: file_path.clone(),
        file_name,
        title,
        author,
        byte_size,
        sha256,
        format_matches: expected_format.is_empty() || format == expected_format,
        title_matches,
        author_matches,
        source_path_matches: normalized_candidate.is_some()
            && normalized_expected.is_some()
            && normalized_candidate == normalized_expected,
        source_hash_matches,
        file_exists,
        format,
    })
}

#[tauri::command]
pub(crate) fn restore_removed_library_book(
    app: tauri::AppHandle,
    record_id: String,
) -> Result<Vec<LibraryBookRecord>, String> {
    let library_root = ensure_library_root(&app)?;
    let library_json = library_root.join("library.json");
    let mut records = load_library_records(&library_json)?;
    let mut record = get_removed_library_record(&app, &record_id)?
        .or_else(|| find_persisted_library_record(&records, &record_id))
        .ok_or_else(|| "Library record not found for restore".to_string())?;
    let original_record = record.clone();
    let stored_path = resolve_library_owned_destination_path(&app, &record.file_path)?;

    let source_path = record.source_path.as_deref().ok_or_else(|| {
        "Cannot restore a removed book without an original source path".to_string()
    })?;
    let source_path = canonicalize_existing_file_path(source_path)?;
    if !is_supported_associated_book_path(&source_path) {
        return Err("Cannot restore an unsupported book format".to_string());
    }

    if let Some(parent) = stored_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    fs::copy(&source_path, &stored_path).map_err(|error| error.to_string())?;

    records.retain(|existing| existing.id != record.id && existing.file_path != record.file_path);
    record.file_path = stored_path.to_string_lossy().to_string();
    record.source_path = Some(source_path.to_string_lossy().to_string());
    record.library_file_exists = None;
    record.source_file_exists = None;
    records.insert(0, record);
    save_library_records(&library_json, &records)?;
    forget_removed_library_record(&app, &original_record)?;
    decorate_library_record_file_states(&mut records);
    Ok(records)
}

#[tauri::command]
pub(crate) fn import_readest_library(app: tauri::AppHandle) -> Result<ReadestImportResult, String> {
    let readest_library_json = readest_library_json_path(&app)?;
    let readest_books_root = readest_books_root(&app)?;
    let readest_records = load_readest_records(&readest_library_json)?;
    let library_root = ensure_library_root(&app)?;
    let books_dir = library_root.join("books");
    fs::create_dir_all(&books_dir).map_err(|error| error.to_string())?;
    let library_json = library_root.join("library.json");
    let mut records = load_library_records(&library_json)?;
    let mut imported = Vec::new();
    let total_detected = readest_records.len();
    let mut replaced_count = 0usize;
    let mut skipped_missing_files = 0usize;

    for readest_record in readest_records {
        let Some(source_file) = find_readest_book_file(&readest_books_root, &readest_record)?
        else {
            skipped_missing_files += 1;
            continue;
        };

        let record_id = format!("readest-{}", readest_record.hash);
        let destination_dir = books_dir.join(&record_id);
        if destination_dir.exists() {
            fs::remove_dir_all(&destination_dir).map_err(|error| error.to_string())?;
        }
        fs::create_dir_all(&destination_dir).map_err(|error| error.to_string())?;

        let source_filename = source_file
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(|| "Invalid Readest filename".to_string())?;
        let stored_book_path = destination_dir.join(sanitize_filename(source_filename));
        fs::copy(&source_file, &stored_book_path).map_err(|error| error.to_string())?;

        let readest_book_dir = source_file
            .parent()
            .ok_or_else(|| "Invalid Readest book directory".to_string())?;
        let readest_cover = readest_book_dir.join("cover.png");
        let cover_path = if readest_cover.exists() {
            let readest_cover =
                fs::canonicalize(&readest_cover).map_err(|error| error.to_string())?;
            if !readest_cover.is_file() || !readest_cover.starts_with(readest_book_dir) {
                None
            } else {
                let copied_cover = destination_dir.join("cover.png");
                fs::copy(&readest_cover, &copied_cover).map_err(|error| error.to_string())?;
                Some(copied_cover.to_string_lossy().to_string())
            }
        } else {
            None
        };

        let imported_at = readest_record
            .downloaded_at
            .or(readest_record.created_at)
            .unwrap_or(now_millis()?);
        let readest_config = load_readest_config(&readest_books_root, &readest_record.hash)?;
        let readest_metadata = parse_readest_metadata(readest_record.metadata.as_ref())?;
        let progress = format_readest_progress(readest_record.progress.as_deref());
        let status = if progress == "尚未开始" {
            "从 Readest 导入".to_string()
        } else {
            "继续阅读".to_string()
        };

        let mut record = LibraryBookRecord {
            id: record_id.clone(),
            title: readest_record.title.clone(),
            author: if readest_record.author.trim().is_empty() {
                "Unknown author".to_string()
            } else {
                readest_record.author.clone()
            },
            format: readest_record.format.clone(),
            description: readest_metadata.description,
            language: readest_metadata.language,
            publisher: readest_metadata.publisher,
            collection: None,
            tags: Vec::new(),
            progress,
            status,
            file_path: stored_book_path.to_string_lossy().to_string(),
            cover_path,
            source_path: Some(source_file.to_string_lossy().to_string()),
            imported_at,
            progress_fraction: readest_progress_fraction(readest_record.progress.as_deref()),
            progress_location: readest_config.location,
            last_opened_at: readest_record.downloaded_at.or(readest_record.created_at),
            library_file_exists: None,
            source_file_exists: None,
        };
        normalize_pdf_progress_location(&mut record);

        let previous_len = records.len();
        records.retain(|book| book.id != record_id);
        if records.len() != previous_len {
            replaced_count += 1;
        }
        records.insert(0, record.clone());
        imported.push(record);
    }

    save_library_records(&library_json, &records)?;
    decorate_library_record_file_states(&mut imported);
    Ok(ReadestImportResult {
        imported_count: imported.len(),
        records: imported,
        replaced_count,
        skipped_missing_files,
        total_detected,
    })
}

#[tauri::command]
#[allow(clippy::too_many_arguments)]
pub(crate) fn update_library_reading_state(
    app: tauri::AppHandle,
    file_path: String,
    title: String,
    author: String,
    chapter_label: String,
    progress_label: String,
    progress_fraction: f64,
    progress_location: Option<String>,
) -> Result<(), String> {
    let library_json = library_json_path(&app)?;
    let mut records = load_library_records(&library_json)?;

    let Some(record) = records
        .iter_mut()
        .find(|record| record.file_path == file_path)
    else {
        return Ok(());
    };

    let next_title = derive_library_title(record, &title);
    record.title = next_title.clone();
    if !author_looks_like_placeholder(&author) {
        record.author = author.trim().to_string();
    }

    record.status = derive_library_status(progress_fraction, &chapter_label, &next_title);
    record.progress = if progress_fraction > 0.0 {
        format!("上次读到 {progress_label}")
    } else {
        "刚刚打开".to_string()
    };
    record.progress_fraction = Some(progress_fraction);
    record.progress_location = progress_location.filter(|value| !value.trim().is_empty());
    record.last_opened_at = Some(now_millis()?);

    save_library_records(&library_json, &records)
}

#[tauri::command]
pub(crate) fn load_library_cover_data_urls(
    app: tauri::AppHandle,
    cover_paths: Vec<Option<String>>,
) -> Result<Vec<Option<String>>, String> {
    cover_paths
        .into_iter()
        .map(|cover_path| {
            let Some(path) = cover_path else {
                return Ok(None);
            };

            let path = resolve_library_owned_cover_path(&app, &path)?;
            let bytes = fs::read(&path).map_err(|error| error.to_string())?;
            let mime = cover_mime_type(&path);
            let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
            Ok(Some(format!("data:{mime};base64,{encoded}")))
        })
        .collect()
}

#[tauri::command]
pub(crate) fn load_library_book_binary(
    app: tauri::AppHandle,
    file_path: String,
) -> Result<LibraryBookBinary, String> {
    let path = resolve_trusted_library_book_path(&app, &file_path)?;
    let bytes = fs::read(&path).map_err(|error| error.to_string())?;
    let name = path
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "Invalid book filename".to_string())?
        .to_string();

    Ok(LibraryBookBinary {
        name,
        mime_type: book_mime_type(&path).to_string(),
        bytes_base64: base64::engine::general_purpose::STANDARD.encode(bytes),
    })
}

#[tauri::command]
pub(crate) fn load_library_file_fingerprint(
    app: tauri::AppHandle,
    file_path: String,
) -> Result<String, String> {
    let path = resolve_trusted_library_book_path(&app, &file_path)?;
    let metadata = fs::metadata(&path).map_err(|error| error.to_string())?;
    let modified = metadata
        .modified()
        .map_err(|error| error.to_string())?
        .duration_since(std::time::UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_millis();
    Ok(format!(
        "{}:{}:{}",
        path.to_string_lossy(),
        metadata.len(),
        modified
    ))
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
        std::env::temp_dir().join(format!("br1-library-{name}-{suffix}"))
    }

    fn sample_record(id: &str, file_path: &str, source_path: Option<&str>) -> LibraryBookRecord {
        LibraryBookRecord {
            id: id.to_string(),
            title: "Test Book".to_string(),
            author: "Test Author".to_string(),
            format: "epub".to_string(),
            description: None,
            language: None,
            publisher: None,
            collection: None,
            tags: Vec::new(),
            progress: "尚未开始".to_string(),
            status: "待读".to_string(),
            file_path: file_path.to_string(),
            cover_path: None,
            source_path: source_path.map(str::to_string),
            imported_at: 1,
            progress_fraction: None,
            progress_location: None,
            last_opened_at: None,
            library_file_exists: None,
            source_file_exists: None,
        }
    }

    #[test]
    fn supported_book_paths_are_extension_limited_and_case_insensitive() {
        assert!(is_supported_associated_book_path(Path::new("book.EPUB")));
        assert!(is_supported_associated_book_path(Path::new("book.pdf")));
        assert!(is_supported_associated_book_path(Path::new("book.cbz")));
        assert!(!is_supported_associated_book_path(Path::new("book.png")));
        assert!(!is_supported_associated_book_path(Path::new("book")));
    }

    #[test]
    fn selected_library_book_paths_must_be_existing_supported_files() {
        let dir = unique_test_dir("normalize-selected");
        fs::create_dir_all(&dir).expect("create temp test dir");
        let supported = dir.join("Bridge Reader.EPUB");
        let unsupported = dir.join("secret.json");
        fs::write(&supported, b"epub bytes").expect("write supported fixture");
        fs::write(&unsupported, b"json bytes").expect("write unsupported fixture");

        let normalized =
            normalize_selected_library_book_path(supported.clone()).expect("supported file works");
        assert_eq!(
            normalized,
            fs::canonicalize(&supported).expect("canonical supported path")
        );
        assert!(normalize_selected_library_book_path(unsupported)
            .expect_err("unsupported extension should be rejected")
            .contains("not supported"));
        assert!(normalize_selected_library_book_path(dir.join("missing.epub")).is_err());

        let _ = fs::remove_dir_all(dir);
    }

    #[test]
    fn destination_paths_reject_parent_dir_components_before_restore() {
        assert!(has_parent_dir_component(Path::new(
            "/tmp/br1/books/../secret.epub"
        )));
        assert!(!has_parent_dir_component(Path::new(
            "/tmp/br1/books/book.epub"
        )));
    }

    #[test]
    fn persisted_record_lookup_uses_record_identity_not_renderer_source_path() {
        let records = vec![
            sample_record(
                "record-a",
                "/library/books/record-a/book.epub",
                Some("/outside/source-a.epub"),
            ),
            sample_record(
                "record-b",
                "/library/books/record-b/book.epub",
                Some("/outside/source-b.epub"),
            ),
        ];

        assert_eq!(
            find_persisted_library_record(&records, "record-a")
                .expect("record id lookup should work")
                .source_path
                .as_deref(),
            Some("/outside/source-a.epub")
        );
        assert_eq!(
            find_persisted_library_record(&records, "/library/books/record-b/book.epub")
                .expect("stored library path lookup should work")
                .id,
            "record-b"
        );
        assert!(find_persisted_library_record(&records, "/outside/source-a.epub").is_none());
    }

    #[test]
    fn persisted_source_path_allowlist_requires_exact_stored_key() {
        let records = vec![sample_record(
            "record-a",
            "/library/books/record-a/book.epub",
            Some("/trusted/source.epub"),
        )];

        assert!(persisted_record_source_path_key_contains(
            &records,
            "/trusted/source.epub"
        ));
        assert!(!persisted_record_source_path_key_contains(
            &records,
            "/trusted/../secret.epub"
        ));
        assert!(!persisted_record_source_path_key_contains(
            &records,
            "/untrusted/source.epub"
        ));
    }
}
