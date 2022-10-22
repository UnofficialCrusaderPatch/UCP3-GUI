#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod gui_config;

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![gui_config::add_dir_to_fs_scope])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
