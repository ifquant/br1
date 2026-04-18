use tauri::Manager;

mod commands;
mod models;
mod util;

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

            if let Some(main_window) = app.get_webview_window("main") {
                let _ = main_window.show();
                let _ = main_window.set_focus();
            }
        }))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init());

    #[cfg(feature = "webdriver")]
    let builder = builder.plugin(tauri_plugin_webdriver::init());

    builder
        .invoke_handler(tauri::generate_handler![
            commands::bookmarks::load_reader_bookmarks,
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
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
