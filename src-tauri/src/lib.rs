use tauri::{Manager, RunEvent};

mod commands;
mod models;
mod util;

fn focus_main_window<R: tauri::Runtime>(app: &tauri::AppHandle<R>) {
    if let Some(main_window) = app.get_webview_window("main") {
        let _ = main_window.show();
        let _ = main_window.set_focus();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .manage(models::PendingAssociatedBookOpenRequests::default())
        .plugin(tauri_plugin_single_instance::init(|app, argv, cwd| {
            let _ = commands::library::queue_associated_book_open_requests_runtime(
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
            commands::highlights_workspace::load_reader_highlights_workspace_state,
            commands::library::load_library_books,
            commands::library::load_library_book_binary,
            commands::library::load_library_file_fingerprint,
            commands::library::load_library_cover_data_urls,
            commands::library::consume_associated_book_open_requests,
            commands::search_cache::load_reader_search_cache,
            commands::notes::load_reader_notes,
            commands::search_cache::clear_reader_search_cache,
            commands::library::detect_readest_library,
            commands::library::import_library_books,
            commands::library::import_readest_library,
            commands::library::queue_associated_book_open_requests,
            commands::bookmarks::save_reader_bookmarks,
            commands::highlights_workspace::save_reader_highlights_workspace_state,
            commands::notes::save_reader_notes,
            commands::search_cache::save_reader_search_cache,
            commands::library::update_library_reading_state
        ])
        .setup(|app| {
            let _ = commands::library::queue_associated_book_open_requests_runtime(
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
            let _ = commands::library::queue_associated_book_open_requests_runtime(
                app,
                urls.into_iter().map(|url| url.to_string()).collect(),
                None,
            );
            focus_main_window(app);
        }
    });
}
