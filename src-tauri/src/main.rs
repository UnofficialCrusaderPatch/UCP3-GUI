#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod constants;
mod gui_config;
mod hash_utils;
mod logging;
mod utils;
mod zip_utils;

use std::{collections::HashMap, fs::File, sync::Mutex};
use tauri::RunEvent;

use gui_config::GuiConfig;
use utils::do_with_mutex_state;
use zip::ZipArchive;

fn main() {
    let tauri_app = tauri::Builder::default()
        // all frontend funcs (TODO: is there a better way to collect them?)
        .invoke_handler(tauri::generate_handler![
            gui_config::set_config_language,
            gui_config::get_config_language,
            gui_config::get_config_recent_folders,
            gui_config::get_config_most_recent_folder,
            gui_config::add_config_recent_folder,
            gui_config::remove_config_recent_folder,
            zip_utils::extract_zip_to_path,
            zip_utils::load_zip,
            zip_utils::close_zip,
            zip_utils::exist_zip_entry,
            zip_utils::get_zip_entry_as_binary,
            zip_utils::get_zip_entry_as_text,
            hash_utils::get_sha256_of_file,
            logging::log,
        ])
        // logger
        .manage::<Mutex<log4rs::Handle>>(Mutex::new(logging::init_logging()))
        // config
        .manage::<Mutex<GuiConfig>>(Mutex::new(GuiConfig::new()))
        // for zips (currently only allows file source)
        .manage::<Mutex<HashMap<usize, ZipArchive<File>>>>(Mutex::new(HashMap::new()))
        .build(tauri::generate_context!())
        .expect("error while running tauri application");

    tauri_app.run(|app_handle, event| match event {
        RunEvent::Ready {} => {
            do_with_mutex_state::<GuiConfig, _>(app_handle, |gui_config| {
                gui_config.load_saved_config(app_handle);
                do_with_mutex_state::<log4rs::Handle, _>(app_handle, |log_handle| {
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
            do_with_mutex_state::<GuiConfig, _>(app_handle, |gui_config| {
                gui_config.save_config();
            });
        }
        _ => {}
    });
}
