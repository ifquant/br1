use tauri::Manager;

mod commands;
mod models;
mod util;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init());

    #[cfg(feature = "webdriver")]
    let builder = builder.plugin(tauri_plugin_webdriver::init());

    builder
        .invoke_handler(tauri::generate_handler![
            commands::library::load_library_books,
            commands::library::load_library_book_binary,
            commands::library::load_library_file_fingerprint,
            commands::library::load_library_cover_data_urls,
            commands::search_cache::load_reader_search_cache,
            commands::notes::load_reader_notes,
            commands::search_cache::clear_reader_search_cache,
            commands::library::detect_readest_library,
            commands::library::import_library_books,
            commands::library::import_readest_library,
            commands::notes::save_reader_notes,
            commands::search_cache::save_reader_search_cache,
            commands::library::update_library_reading_state
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
