#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod gui_config;
mod utils;
mod zip_utils;

use std::sync::Mutex;
use tauri::RunEvent;

use gui_config::GuiConfig;
use utils::do_with_mutex_state;

fn main() {
    let tauri_app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            gui_config::set_config_language,
            gui_config::get_config_language,
            gui_config::get_config_recent_folders,
            gui_config::get_config_most_recent_folder,
            gui_config::add_config_recent_folder,
            gui_config::remove_config_recent_folder,
            zip_utils::extract_zip_to_path
        ])
        .manage::<Mutex<GuiConfig>>(Mutex::new(GuiConfig::new()))
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    tauri_app.run(|_app_handle, event| match event {
        RunEvent::Ready {} => {
            do_with_mutex_state::<GuiConfig, _>(_app_handle, |gui_config| {
                gui_config.load_saved_config(_app_handle)
            });
        }
        RunEvent::Exit {} => {
            do_with_mutex_state::<GuiConfig, _>(_app_handle, |gui_config| {
                gui_config.save_config();
            });
        }
        _ => {}
    });
}
