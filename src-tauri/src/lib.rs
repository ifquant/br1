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
    progress: String,
    status: String,
    file_path: String,
    source_path: Option<String>,
    imported_at: u64,
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
            progress: "等待首轮阅读".to_string(),
            status: "新导入".to_string(),
            file_path: stored_path.to_string_lossy().to_string(),
            source_path: Some(file_path.clone()),
            imported_at,
        };

        records.retain(|book| book.source_path.as_deref() != Some(file_path.as_str()));
        records.insert(0, record.clone());
        imported.push(record);
    }

    save_library_records(&library_json, &records)?;

    Ok(imported)
}

fn ensure_library_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let app_data_dir = app.path().app_data_dir().map_err(|error| error.to_string())?;
    let library_root = app_data_dir.join("library");
    fs::create_dir_all(&library_root).map_err(|error| error.to_string())?;
    Ok(library_root)
}

fn library_json_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(ensure_library_root(app)?.join("library.json"))
}

fn load_library_records(path: &Path) -> Result<Vec<LibraryBookRecord>, String> {
    if !path.exists() {
        return Ok(Vec::new());
    }

    let json = fs::read_to_string(path).map_err(|error| error.to_string())?;
    serde_json::from_str(&json).map_err(|error| error.to_string())
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            load_library_books,
            import_library_books
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
