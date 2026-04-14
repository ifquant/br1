use crate::models::{
    LibraryBookBinary, LibraryBookRecord, ReadestImportResult, ReadestLibrarySummary,
};
use crate::util::{
    book_mime_type, cover_mime_type, ensure_library_root, find_readest_book_file,
    format_readest_progress, library_json_path, load_library_records, load_readest_config,
    load_readest_records, now_millis, parse_readest_metadata, readest_books_root,
    readest_library_json_path, readest_progress_fraction, sanitize_filename, save_library_records,
};
use base64::Engine;
use std::fs;
use std::path::{Path, PathBuf};

#[tauri::command]
pub(crate) fn load_library_books(app: tauri::AppHandle) -> Result<Vec<LibraryBookRecord>, String> {
    let library_json = library_json_path(&app)?;
    load_library_records(&library_json)
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

        let previous_len = records.len();
        records.retain(|book| book.id != record_id);
        if records.len() != previous_len {
            replaced_count += 1;
        }
        records.insert(0, record.clone());
        imported.push(record);
    }

    save_library_records(&library_json, &records)?;
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
