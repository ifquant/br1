use base64::Engine;
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct LibraryBookRecord {
    id: String,
    title: String,
    author: String,
    format: String,
    description: Option<String>,
    language: Option<String>,
    publisher: Option<String>,
    progress: String,
    status: String,
    file_path: String,
    cover_path: Option<String>,
    source_path: Option<String>,
    imported_at: u64,
    progress_fraction: Option<f64>,
    progress_location: Option<String>,
    last_opened_at: Option<u64>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct ReadestLibrarySummary {
    available: bool,
    count: usize,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReadestBookRecord {
    hash: String,
    format: String,
    title: String,
    author: String,
    metadata: Option<String>,
    created_at: Option<u64>,
    downloaded_at: Option<u64>,
    progress: Option<Vec<u64>>,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct ReadestBookConfig {
    location: Option<String>,
}

#[derive(Debug, Clone, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
struct ReadestBookMetadata {
    description: Option<String>,
    publisher: Option<serde_json::Value>,
    language: Option<serde_json::Value>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct LibraryBookBinary {
    name: String,
    mime_type: String,
    bytes_base64: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReaderSearchCacheExcerpt {
    pre: String,
    #[serde(rename = "match")]
    match_text: String,
    post: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ReaderSearchCacheResult {
    cfi: String,
    label: String,
    excerpt: ReaderSearchCacheExcerpt,
}

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn load_library_books(app: tauri::AppHandle) -> Result<Vec<LibraryBookRecord>, String> {
    let library_json = library_json_path(&app)?;
    load_library_records(&library_json)
}

#[tauri::command]
fn detect_readest_library(app: tauri::AppHandle) -> Result<ReadestLibrarySummary, String> {
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
fn import_library_books(
    app: tauri::AppHandle,
    file_paths: Vec<String>,
) -> Result<Vec<LibraryBookRecord>, String> {
    let library_root = ensure_library_root(&app)?;
    let books_dir = library_root.join("books");
    fs::create_dir_all(&books_dir).map_err(|error| error.to_string())?;
    let library_json = library_root.join("library.json");
    let mut records = load_library_records(&library_json)?;
    let mut imported = Vec::new();

    for file_path in file_paths {
        let source = Path::new(&file_path);
        let filename = source
            .file_name()
            .and_then(|name| name.to_str())
            .ok_or_else(|| "Invalid file path".to_string())?
            .to_string();
        let bytes = fs::read(&file_path).map_err(|error| error.to_string())?;
        let imported_at = now_millis()?;
        let id = imported_at.to_string();
        let extension = source
            .extension()
            .and_then(|ext| ext.to_str())
            .unwrap_or("")
            .to_lowercase();
        let safe_filename = sanitize_filename(&filename);
        let stored_filename = format!("{id}-{safe_filename}");
        let stored_path = books_dir.join(stored_filename);

        fs::write(&stored_path, bytes).map_err(|error| error.to_string())?;

        let title = source
            .file_stem()
            .and_then(|stem| stem.to_str())
            .unwrap_or("Imported book")
            .to_string();

        let record = LibraryBookRecord {
            id,
            title,
            author: "Unknown author".to_string(),
            format: if extension.is_empty() {
                "BOOK".to_string()
            } else {
                extension.to_uppercase()
            },
            description: None,
            language: None,
            publisher: None,
            progress: "等待首轮阅读".to_string(),
            status: "新导入".to_string(),
            file_path: stored_path.to_string_lossy().to_string(),
            cover_path: None,
            source_path: Some(file_path.clone()),
            imported_at,
            progress_fraction: None,
            progress_location: None,
            last_opened_at: None,
        };

        records.retain(|book| book.source_path.as_deref() != Some(file_path.as_str()));
        records.insert(0, record.clone());
        imported.push(record);
    }

    save_library_records(&library_json, &records)?;

    Ok(imported)
}

#[tauri::command]
fn import_readest_library(app: tauri::AppHandle) -> Result<Vec<LibraryBookRecord>, String> {
    let readest_library_json = readest_library_json_path(&app)?;
    let readest_books_root = readest_books_root(&app)?;
    let readest_records = load_readest_records(&readest_library_json)?;
    let library_root = ensure_library_root(&app)?;
    let books_dir = library_root.join("books");
    fs::create_dir_all(&books_dir).map_err(|error| error.to_string())?;
    let library_json = library_root.join("library.json");
    let mut records = load_library_records(&library_json)?;
    let mut imported = Vec::new();

    for readest_record in readest_records {
        let Some(source_file) = find_readest_book_file(&readest_books_root, &readest_record)? else {
            continue;
        };

        let record_id = format!("readest-{}", readest_record.hash);
        let destination_dir = books_dir.join(&record_id);
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
        let readest_metadata = parse_readest_metadata(readest_record.metadata.as_deref())?;
        let progress = format_readest_progress(readest_record.progress.as_deref());
        let status = if progress == "尚未开始" {
            "从 Readest 导入".to_string()
        } else {
            "继续阅读".to_string()
        };

        let record = LibraryBookRecord {
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
        };

        records.retain(|book| book.id != record_id);
        records.insert(0, record.clone());
        imported.push(record);
    }

    save_library_records(&library_json, &records)?;
    Ok(imported)
}

#[tauri::command]
fn update_library_reading_state(
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

    if !title.trim().is_empty() {
        record.title = title;
    }
    if !author.trim().is_empty() {
        record.author = author;
    }

    record.status = if progress_fraction > 0.0 {
        chapter_label
    } else {
        "已打开".to_string()
    };
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
fn load_library_cover_data_urls(cover_paths: Vec<Option<String>>) -> Result<Vec<Option<String>>, String> {
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
fn load_library_book_binary(file_path: String) -> Result<LibraryBookBinary, String> {
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
fn load_library_file_fingerprint(file_path: String) -> Result<String, String> {
    let path = PathBuf::from(&file_path);
    let metadata = fs::metadata(&path).map_err(|error| error.to_string())?;
    let modified = metadata
        .modified()
        .map_err(|error| error.to_string())?
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_millis();
    Ok(format!(
        "{}:{}:{}",
        path.to_string_lossy(),
        metadata.len(),
        modified
    ))
}

#[tauri::command]
fn load_reader_search_cache(
    app: tauri::AppHandle,
    book_key: String,
    cache_key: String,
) -> Result<Option<Vec<ReaderSearchCacheResult>>, String> {
    let cache_path = reader_search_cache_file(&app, &book_key, &cache_key)?;
    if !cache_path.exists() {
        return Ok(None);
    }

    let raw = fs::read_to_string(&cache_path).map_err(|error| error.to_string())?;
    let results =
        serde_json::from_str::<Vec<ReaderSearchCacheResult>>(&raw).map_err(|error| error.to_string())?;
    Ok(Some(results))
}

#[tauri::command]
fn save_reader_search_cache(
    app: tauri::AppHandle,
    book_key: String,
    cache_key: String,
    results: Vec<ReaderSearchCacheResult>,
) -> Result<(), String> {
    let cache_path = reader_search_cache_file(&app, &book_key, &cache_key)?;
    if let Some(parent) = cache_path.parent() {
        fs::create_dir_all(parent).map_err(|error| error.to_string())?;
    }
    let raw = serde_json::to_string(&results).map_err(|error| error.to_string())?;
    fs::write(cache_path, raw).map_err(|error| error.to_string())
}

#[tauri::command]
fn clear_reader_search_cache(app: tauri::AppHandle, book_key: String) -> Result<(), String> {
    let root = reader_search_cache_root(&app)?;
    let book_dir = root.join(base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(book_key));
    if book_dir.exists() {
        fs::remove_dir_all(book_dir).map_err(|error| error.to_string())?;
    }
    Ok(())
}

fn ensure_library_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    let library_root = app_data_dir.join("library");
    fs::create_dir_all(&library_root).map_err(|error| error.to_string())?;
    Ok(library_root)
}

fn readest_library_json_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(readest_books_root(app)?.join("library.json"))
}

fn readest_books_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    let support_root = app_data_dir
        .parent()
        .ok_or_else(|| "Unable to locate application support root".to_string())?;
    Ok(support_root.join("com.bilingify.readest").join("Readest").join("Books"))
}

fn library_json_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(ensure_library_root(app)?.join("library.json"))
}

fn reader_search_cache_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?
        .join("reader-search"))
}

fn reader_search_cache_file(
    app: &tauri::AppHandle,
    book_key: &str,
    cache_key: &str,
) -> Result<PathBuf, String> {
    let root = reader_search_cache_root(app)?;
    let book_dir = base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(book_key);
    let cache_file = format!(
        "{}.json",
        base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(cache_key)
    );
    Ok(root.join(book_dir).join(cache_file))
}

fn load_library_records(path: &Path) -> Result<Vec<LibraryBookRecord>, String> {
    if !path.exists() {
        return Ok(Vec::new());
    }

    let json = fs::read_to_string(path).map_err(|error| error.to_string())?;
    serde_json::from_str(&json).map_err(|error| error.to_string())
}

fn load_readest_records(path: &Path) -> Result<Vec<ReadestBookRecord>, String> {
    if !path.exists() {
        return Ok(Vec::new());
    }

    let json = fs::read_to_string(path).map_err(|error| error.to_string())?;
    serde_json::from_str(&json).map_err(|error| error.to_string())
}

fn load_readest_config(readest_books_root: &Path, hash: &str) -> Result<ReadestBookConfig, String> {
    let config_path = readest_books_root.join(hash).join("config.json");
    if !config_path.exists() {
        return Ok(ReadestBookConfig::default());
    }

    let json = fs::read_to_string(config_path).map_err(|error| error.to_string())?;
    serde_json::from_str(&json).map_err(|error| error.to_string())
}

fn parse_readest_metadata(metadata: Option<&str>) -> Result<ReadestBookMetadataSummary, String> {
    let Some(metadata) = metadata else {
        return Ok(ReadestBookMetadataSummary::default());
    };
    if metadata.trim().is_empty() {
        return Ok(ReadestBookMetadataSummary::default());
    }

    let parsed: ReadestBookMetadata =
        serde_json::from_str(metadata).map_err(|error| error.to_string())?;

    Ok(ReadestBookMetadataSummary {
        description: parsed
            .description
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty()),
        publisher: stringify_metadata_value(parsed.publisher),
        language: stringify_metadata_value(parsed.language),
    })
}

#[derive(Debug, Clone, Default)]
struct ReadestBookMetadataSummary {
    description: Option<String>,
    language: Option<String>,
    publisher: Option<String>,
}

fn stringify_metadata_value(value: Option<serde_json::Value>) -> Option<String> {
    let Some(value) = value else {
        return None;
    };

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

fn save_library_records(path: &Path, records: &[LibraryBookRecord]) -> Result<(), String> {
    let json = serde_json::to_string_pretty(records).map_err(|error| error.to_string())?;
    fs::write(path, json).map_err(|error| error.to_string())
}

fn now_millis() -> Result<u64, String> {
    Ok(SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|error| error.to_string())?
        .as_millis() as u64)
}

fn sanitize_filename(filename: &str) -> String {
    filename
        .chars()
        .map(|character| match character {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            _ => character,
        })
        .collect()
}

fn find_readest_book_file(
    readest_books_root: &Path,
    readest_record: &ReadestBookRecord,
) -> Result<Option<PathBuf>, String> {
    let book_dir = readest_books_root.join(&readest_record.hash);
    if !book_dir.exists() {
        return Ok(None);
    }

    let format = readest_record.format.to_lowercase();
    let mut candidates = Vec::new();
    for entry in fs::read_dir(&book_dir).map_err(|error| error.to_string())? {
        let entry = entry.map_err(|error| error.to_string())?;
        let path = entry.path();
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

fn format_readest_progress(progress: Option<&[u64]>) -> String {
    let Some([current, total, ..]) = progress else {
        return "尚未开始".to_string();
    };

    format!("{current}/{total}")
}

fn readest_progress_fraction(progress: Option<&[u64]>) -> Option<f64> {
    let Some([current, total, ..]) = progress else {
        return None;
    };
    if *total == 0 {
        return None;
    }

    Some((*current as f64 / *total as f64).clamp(0.0, 1.0))
}

fn cover_mime_type(path: &Path) -> &'static str {
    match path
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .to_lowercase()
        .as_str()
    {
        "jpg" | "jpeg" => "image/jpeg",
        "webp" => "image/webp",
        _ => "image/png",
    }
}

fn book_mime_type(path: &Path) -> &'static str {
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
        _ => "application/epub+zip",
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init());

    #[cfg(feature = "webdriver")]
    let builder = builder.plugin(tauri_plugin_webdriver::init());

    builder
        .invoke_handler(tauri::generate_handler![
            greet,
            load_library_books,
            load_library_book_binary,
            load_library_file_fingerprint,
            load_library_cover_data_urls,
            load_reader_search_cache,
            clear_reader_search_cache,
            detect_readest_library,
            import_library_books,
            import_readest_library,
            save_reader_search_cache,
            update_library_reading_state
        ])
        .setup(|_app| {
            #[cfg(feature = "webdriver")]
            {
                _app.add_capability(include_str!("../capabilities-extra/webdriver.json"))?;
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
