#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod gui_config;
mod utils;

use std::sync::Mutex;
use tauri::RunEvent;

use gui_config::{add_dir_to_fs_scope, GuiConfig};
use utils::do_with_mutex_state;

fn main() {
    let tauri_app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![add_dir_to_fs_scope])
        .manage::<Mutex<GuiConfig>>(Mutex::new(GuiConfig::new()))
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    tauri_app.run(|_app_handle, event| match event {
        RunEvent::Ready {} => {
            do_with_mutex_state::<GuiConfig>(_app_handle, |app_handle, gui_config| {
                gui_config.load_saved_config(app_handle)
            });
        }
        RunEvent::Exit {} => {
            do_with_mutex_state::<GuiConfig>(_app_handle, |app_handle, gui_config| {
                gui_config.save_config();
            });
        }
        _ => {}
    });
}
