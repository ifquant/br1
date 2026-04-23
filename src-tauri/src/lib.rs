use serde::Serialize;
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::{Emitter, Manager, RunEvent};

mod commands;
mod models;
mod util;

const ASSOCIATED_BOOK_OPEN_REJECTION_EVENT: &str = "br1:associated-book-open-inputs-rejected";
const SUPPORTED_ASSOCIATED_BOOK_EXTENSIONS: &[&str] =
    &["epub", "pdf", "mobi", "azw3", "fb2", "cbz", "txt"];

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AssociatedBookOpenInputRejection {
    input: String,
    reason: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct AssociatedBookOpenRejectionReport {
    rejected_inputs: Vec<AssociatedBookOpenInputRejection>,
}

fn focus_main_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.show();
        let _ = main_window.set_focus();
    }
}

fn append_associated_book_open_diagnostic<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    stage: &str,
    detail: impl Into<String>,
) {
    let diagnostics = app.state::<models::AssociatedBookOpenDiagnostics>();
    let Ok(mut entries) = diagnostics.0.lock() else {
        return;
    };

    let timestamp_ms = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|value| value.as_millis())
        .unwrap_or_default();
    entries.push(format!("[{timestamp_ms}] {stage}: {}", detail.into()));
    if entries.len() > 128 {
        let overflow = entries.len() - 128;
        entries.drain(0..overflow);
    }
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

fn is_supported_associated_book_path(path: &Path) -> bool {
    let Some(extension) = path.extension().and_then(|value| value.to_str()) else {
        return false;
    };

    SUPPORTED_ASSOCIATED_BOOK_EXTENSIONS.contains(&extension.to_ascii_lowercase().as_str())
}

fn collect_associated_book_open_rejections(
    file_paths: &[String],
    cwd: Option<&Path>,
) -> Vec<AssociatedBookOpenInputRejection> {
    let mut rejected_inputs = Vec::new();
    let mut seen_inputs = std::collections::HashSet::new();

    for file_path in file_paths {
        let trimmed = strip_wrapping_quotes(file_path);
        let normalized_input = trimmed.trim();
        if normalized_input.is_empty() {
            if seen_inputs.insert(String::new()) {
                rejected_inputs.push(AssociatedBookOpenInputRejection {
                    input: file_path.clone(),
                    reason: "empty input".to_string(),
                });
            }
            continue;
        }

        let path = parse_file_url_to_path(strip_wrapping_quotes(file_path))
            .unwrap_or_else(|| PathBuf::from(normalized_input));
        let resolved = if path.is_absolute() {
            path
        } else if let Some(cwd) = cwd {
            cwd.join(path)
        } else {
            path
        };

        if !is_supported_associated_book_path(&resolved)
            && seen_inputs.insert(normalized_input.to_string())
        {
            rejected_inputs.push(AssociatedBookOpenInputRejection {
                input: file_path.clone(),
                reason: "unsupported format".to_string(),
            });
        }
    }

    rejected_inputs
}

fn queue_associated_book_open_requests_with_report<R: tauri::Runtime>(
    app: &tauri::AppHandle<R>,
    file_paths: Vec<String>,
    cwd: Option<PathBuf>,
) {
    append_associated_book_open_diagnostic(
        app,
        "queue_with_report.begin",
        format!("inputs={:?}, cwd={:?}", file_paths, cwd),
    );
    let rejected_inputs = collect_associated_book_open_rejections(&file_paths, cwd.as_deref());
    if !rejected_inputs.is_empty() {
        append_associated_book_open_diagnostic(
            app,
            "queue_with_report.rejected",
            format!("count={}", rejected_inputs.len()),
        );
        let _ = app.emit_to(
            "main",
            ASSOCIATED_BOOK_OPEN_REJECTION_EVENT,
            AssociatedBookOpenRejectionReport { rejected_inputs },
        );
    }

    let result =
        commands::library::queue_associated_book_open_requests_runtime(app, file_paths, cwd);
    append_associated_book_open_diagnostic(
        app,
        "queue_with_report.end",
        format!("result={result:?}"),
    );
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .manage(models::PendingAssociatedBookOpenRequests::default())
        .manage(models::AssociatedBookOpenDiagnostics::default())
        .manage(models::TrustedAssociatedBookOpenPaths::default())
        .manage(models::TrustedLibraryImportPaths::default())
        .manage(models::RemovedLibraryBookRecords::default())
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            append_associated_book_open_diagnostic(
                app,
                "single_instance",
                format!("argv={argv:?}, cwd={cwd}"),
            );
            queue_associated_book_open_requests_with_report(
                app,
                argv.into_iter().skip(1).collect(),
                Some(std::path::PathBuf::from(cwd)),
            );

            focus_main_window(app);
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init());

    #[cfg(feature = "webdriver")]
    let builder = builder.plugin(tauri_plugin_webdriver::init());

    let app = builder
        .invoke_handler(tauri::generate_handler![
            commands::bookmarks::load_reader_bookmarks,
            commands::catalogs::browse_catalog_source,
            commands::catalogs::create_catalog_import_intent,
            commands::catalogs::get_catalog_connector_status,
            commands::catalogs::list_catalog_sources,
            commands::catalogs::search_catalog_source,
            commands::highlights_workspace::load_reader_highlights_workspace_state,
            commands::library::load_library_books,
            commands::library::load_library_book_binary,
            commands::library::load_library_file_fingerprint,
            commands::library::load_library_cover_data_urls,
            commands::library::consume_associated_book_open_requests,
            commands::reader_services::lookup_reader_assistance,
            commands::search_cache::load_reader_search_cache,
            commands::notes::load_reader_notes,
            commands::search_cache::clear_reader_search_cache,
            commands::library::detect_readest_library,
            commands::library::select_library_book_paths,
            commands::library::select_single_library_book_path,
            commands::library::import_library_books,
            commands::library::import_readest_library,
            commands::library::preview_library_repair_candidate,
            #[cfg(feature = "webdriver")]
            commands::library::queue_associated_book_open_requests,
            #[cfg(feature = "webdriver")]
            commands::library::inspect_associated_book_open_requests_for_webdriver,
            #[cfg(feature = "webdriver")]
            commands::library::inspect_associated_book_open_diagnostics_for_webdriver,
            #[cfg(feature = "webdriver")]
            commands::library::trust_library_import_paths_for_webdriver,
            #[cfg(feature = "webdriver")]
            commands::library::probe_untrusted_library_paths_for_webdriver,
            commands::library::remove_library_book,
            commands::library::restore_removed_library_book,
            commands::library::update_library_book_metadata,
            commands::bookmarks::save_reader_bookmarks,
            commands::highlights_workspace::save_reader_highlights_workspace_state,
            commands::notes::save_reader_notes,
            commands::search_cache::save_reader_search_cache,
            commands::library::update_library_reading_state
        ])
        .setup(|app| {
            append_associated_book_open_diagnostic(
                app.handle(),
                "setup",
                format!("argv={:?}", std::env::args().collect::<Vec<_>>()),
            );
            queue_associated_book_open_requests_with_report(
                app.handle(),
                std::env::args().skip(1).collect(),
                std::env::current_dir().ok(),
            );

            #[cfg(feature = "webdriver")]
            {
                app.add_capability(include_str!("../capabilities-extra/webdriver.json"))?;
            }

            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app, event| {
        #[cfg(any(target_os = "macos", target_os = "ios"))]
        if let RunEvent::Opened { urls } = event {
            append_associated_book_open_diagnostic(app, "opened", format!("urls={urls:?}"));
            queue_associated_book_open_requests_with_report(
                app,
                urls.into_iter().map(|url| url.to_string()).collect(),
                None,
            );
            focus_main_window(app);
        }
    });
}
