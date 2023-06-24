#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod constants;
mod gui_config;
mod hash_utils;
mod logging;
mod utils;
mod zip_support;

use std::sync::Mutex;
use tauri::{RunEvent, Wry};

use gui_config::GuiConfig;
use utils::do_with_mutex_state;

fn main() {
    let tauri_app = tauri::Builder::default()
        .plugin(logging::init())
        .plugin(zip_support::init())
        // all frontend funcs (TODO: is there a better way to collect them?)
        .invoke_handler(tauri::generate_handler![
            gui_config::set_config_language,
            gui_config::get_config_language,
            gui_config::get_config_recent_folders,
            gui_config::get_config_most_recent_folder,
            gui_config::add_config_recent_folder,
            gui_config::remove_config_recent_folder,
            hash_utils::get_sha256_of_file,
        ])
        // config
        .manage::<Mutex<GuiConfig>>(Mutex::new(GuiConfig::new()))
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    tauri_app.run(|app_handle, event| match event {
        RunEvent::Ready {} => {
            do_with_mutex_state::<Wry, GuiConfig, _>(app_handle, |gui_config| {
                gui_config.load_saved_config(app_handle);
                do_with_mutex_state::<Wry, log4rs::Handle, _>(app_handle, |log_handle| {
                    logging::set_root_log_level_with_string(
                        app_handle,
                        log_handle,
                        gui_config
                            .get_log_level()
                            .map_or("", |log_level| log_level.as_str()),
                    )
                });
            });
        }
        RunEvent::Exit {} => {
            do_with_mutex_state::<Wry, GuiConfig, _>(app_handle, |gui_config| {
                gui_config.save_config();
            });
        }
        _ => {}
    });
}
