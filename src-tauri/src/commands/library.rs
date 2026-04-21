use crate::models::{
    AssociatedBookOpenRequest, LibraryBookBinary, LibraryBookRecord, PendingAssociatedBookOpenRequests,
    ReadestImportResult, ReadestLibrarySummary,
};
use crate::util::{
    book_mime_type, cover_mime_type, ensure_library_root, find_readest_book_file,
    format_readest_progress, library_json_path, load_library_records, load_readest_config,
    load_readest_records, normalize_library_records, normalize_pdf_progress_location, now_millis,
    parse_readest_metadata, readest_books_root, readest_library_json_path, readest_progress_fraction,
    sanitize_filename, save_library_records,
};
use base64::Engine;
use quick_xml::events::Event;
use quick_xml::name::QName;
use quick_xml::Reader;
use std::collections::HashSet;
use std::fs;
use std::io::{ErrorKind, Read};
use std::path::{Path, PathBuf};
use tauri::{Emitter, Manager};
use zip::ZipArchive;

pub(crate) const ASSOCIATED_BOOK_OPEN_EVENT: &str = "br1:associated-book-open-requested";

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

    matches!(
        extension.to_ascii_lowercase().as_str(),
        "epub" | "pdf" | "fb2" | "mobi" | "azw3" | "cbz" | "txt"
    )
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

    let pending = app.state::<PendingAssociatedBookOpenRequests>();
    let mut queue = pending.0.lock().map_err(|_| "Failed to lock associated-book queue".to_string())?;
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
            "Unknown author" | "Reader workspace" | "Preparing book" | "Open failed"
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

fn derive_cbz_cover_asset(source: &Path) -> Option<(String, Vec<u8>)> {
    let file = fs::File::open(source).ok()?;
    let mut archive = ZipArchive::new(file).ok()?;

    let pick_index = (0..archive.len()).find(|index| {
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
    }).or_else(|| {
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
                QName(b"first-name") | QName(b"last-name") | QName(b"nickname") => current_field = None,
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
                    Some("language") if metadata.language.is_none() => metadata.language = Some(value),
                    Some("description") if metadata.description.is_none() => metadata.description = Some(value),
                    Some("publisher") if metadata.publisher.is_none() => metadata.publisher = Some(value),
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
    let utf8 = String::from_utf8_lossy(value).trim_matches(char::from(0)).trim().to_string();
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
        .and_then(|source_path| Path::new(source_path).file_stem().and_then(|stem| stem.to_str()))
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
            [record_title_key.as_str(), record_source_key.as_str(), record_library_key.as_str()]
                .into_iter()
                .any(|record_key| !record_key.is_empty() && record_key == incoming_key)
        })
}

fn authors_match_for_repair(record: &LibraryBookRecord, incoming_author: &str) -> bool {
    if author_looks_like_placeholder(incoming_author) || author_looks_like_placeholder(&record.author) {
        return true;
    }

    let incoming_author_key = normalize_status_key(incoming_author);
    let record_author_key = normalize_status_key(&record.author);
    incoming_author_key.is_empty() || record_author_key.is_empty() || incoming_author_key == record_author_key
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
    value.chars()
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

    if status_looks_like_internal_asset(chapter_label) || status_looks_like_title(chapter_label, title) {
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
pub(crate) fn queue_associated_book_open_requests(
    app: tauri::AppHandle,
    file_paths: Vec<String>,
) -> Result<usize, String> {
    queue_associated_book_open_requests_runtime(&app, file_paths, None)
}

#[tauri::command]
pub(crate) fn consume_associated_book_open_requests(
    app: tauri::AppHandle,
) -> Result<Vec<AssociatedBookOpenRequest>, String> {
    let pending = app.state::<PendingAssociatedBookOpenRequests>();
    let mut queue = pending.0.lock().map_err(|_| "Failed to lock associated-book queue".to_string())?;
    let requests = std::mem::take(&mut *queue);
    Ok(requests)
}

#[tauri::command]
pub(crate) fn detect_readest_library(app: tauri::AppHandle) -> Result<ReadestLibrarySummary, String> {
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
        let source = Path::new(&file_path);
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
            kindle_metadata.title.clone().unwrap_or(default_title.clone())
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
        let bytes = fs::read(&file_path).map_err(|error| error.to_string())?;
        let format = if extension.is_empty() {
            "BOOK".to_string()
        } else {
            extension.to_uppercase()
        };
        let repair_index = find_repairable_library_record_index(
            &records,
            &file_path,
            source,
            &title,
            &author,
            &format,
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
            derive_cbz_cover_asset(source).and_then(|(entry_name, cover_bytes)| {
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
                .map(|record| choose_repaired_optional(record.description.clone(), description.clone()))
                .unwrap_or(description),
            language: existing_record
                .as_ref()
                .map(|record| choose_repaired_optional(record.language.clone(), language.clone()))
                .unwrap_or(language),
            publisher: existing_record
                .as_ref()
                .map(|record| choose_repaired_optional(record.publisher.clone(), publisher.clone()))
                .unwrap_or(publisher),
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
            progress_fraction: existing_record.as_ref().and_then(|record| record.progress_fraction),
            progress_location: existing_record
                .as_ref()
                .and_then(|record| record.progress_location.clone()),
            last_opened_at: existing_record.as_ref().and_then(|record| record.last_opened_at),
            library_file_exists: None,
            source_file_exists: None,
        };

        if let Some(existing_record) = existing_record.as_ref() {
            cleanup_repaired_record_assets(existing_record, &stored_path, cbz_cover_path.as_deref());
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

    save_library_records(&library_json, &records)?;
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
        let Some(source_file) = find_readest_book_file(&readest_books_root, &readest_record)? else {
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

        let readest_cover = readest_books_root.join(&readest_record.hash).join("cover.png");
        let cover_path = if readest_cover.exists() {
            let copied_cover = destination_dir.join("cover.png");
            fs::copy(&readest_cover, &copied_cover).map_err(|error| error.to_string())?;
            Some(copied_cover.to_string_lossy().to_string())
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

    let Some(record) = records.iter_mut().find(|record| record.file_path == file_path) else {
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
    cover_paths: Vec<Option<String>>,
) -> Result<Vec<Option<String>>, String> {
    cover_paths
        .into_iter()
        .map(|cover_path| {
            let Some(path) = cover_path else {
                return Ok(None);
            };

            let bytes = fs::read(&path).map_err(|error| error.to_string())?;
            let mime = cover_mime_type(Path::new(&path));
            let encoded = base64::engine::general_purpose::STANDARD.encode(bytes);
            Ok(Some(format!("data:{mime};base64,{encoded}")))
        })
        .collect()
}

#[tauri::command]
pub(crate) fn load_library_book_binary(file_path: String) -> Result<LibraryBookBinary, String> {
    let path = PathBuf::from(&file_path);
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
pub(crate) fn load_library_file_fingerprint(file_path: String) -> Result<String, String> {
    let path = PathBuf::from(&file_path);
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
