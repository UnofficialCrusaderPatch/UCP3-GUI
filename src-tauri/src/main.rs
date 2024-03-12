#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod constants;
mod file_support;
mod gui_config;
mod hash_utils;
mod logging;
mod run_program;
mod utils;
mod zip_support;

fn main() {
    let tauri_app = tauri::Builder::default()
        .plugin(logging::init()) // logging is loaded first, currently using INFO until set by config
        .plugin(gui_config::init())
        .plugin(zip_support::init())
        .plugin(tauri_plugin_upload::init())
        .invoke_handler(tauri::generate_handler![
            hash_utils::get_sha256_of_file,
            run_program::os_open_program,
            file_support::slashify,
            file_support::canonicalize,
            file_support::read_and_filter_dir
        ])
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    tauri_app.run(|_app_handle, _event| {});
}
