use log4rs::Handle;
use serde::{Deserialize, Serialize};
use std::{
    fs, io,
    path::PathBuf,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{
    api::dialog::message,
    plugin::{Builder, TauriPlugin},
    AppHandle, Manager, RunEvent, Runtime,
};

use crate::{
    constants::{CONFIG_FILE_NAME, LOG_LEVEL_DEFAULT, MESSAGE_TITLE, NUMBER_OF_RECENT_FOLDERS},
    utils::get_state_mutex_from_handle,
};
use crate::{logging, utils::get_roaming_folder_path};

#[derive(Serialize, Deserialize)]
struct RecentFolder {
    path: String,
    date: u64,
}

impl RecentFolder {
    fn new(path: &str) -> RecentFolder {
        let mut recent_folder = RecentFolder {
            path: String::from(path),
            date: 0,
        };
        recent_folder.update_entry_date();
        recent_folder
    }

    fn update_entry_date(&mut self) {
        // source: https://stackoverflow.com/a/44378174
        let duration_since_unix_epoch = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("Time went backwards.");
        let entry_date = duration_since_unix_epoch.as_secs() * 1000
            + duration_since_unix_epoch.subsec_nanos() as u64 / 1_000_000;
        self.date = entry_date;
    }
}

#[derive(Serialize)]
pub struct GuiConfig {
    #[serde(skip_serializing)]
    init: bool,

    recent_folders: Vec<RecentFolder>,
    log_level: String,
}

impl GuiConfig {
    fn get_config_file_path() -> PathBuf {
        let mut path = get_roaming_folder_path(); // simply crashes on error
        path.push(CONFIG_FILE_NAME);
        path
    }

    fn check_if_init(&self) -> bool {
        if !self.init {
            message(
                None::<&tauri::Window>,
                MESSAGE_TITLE,
                format!("Tried to run gui config function before init."),
            );
        }
        self.init
    }

    fn sort_recent_folders(&mut self) {
        self.recent_folders.sort_by(|a, b| b.date.cmp(&a.date));
    }

    fn add_loaded_recent_to_scope<R: Runtime>(&self, app_handle: &AppHandle<R>) {
        for recent_folder in &self.recent_folders {
            if let Some(error) = app_handle
                .fs_scope()
                .allow_directory(&recent_folder.path, true)
                .err()
            {
                message(
                    None::<&tauri::Window>,
                    MESSAGE_TITLE,
                    format!("Failed to add path to scope: {}", error.to_string()),
                );
            }
        }
    }

    pub fn new() -> GuiConfig {
        GuiConfig {
            init: false,
            recent_folders: Vec::with_capacity(NUMBER_OF_RECENT_FOLDERS),
            log_level: String::from(LOG_LEVEL_DEFAULT),
        }
    }

    pub fn load_saved_config<R: Runtime>(&mut self, app_handle: &AppHandle<R>) {
        let load_result = || -> Result<(), io::Error> {
            let path = GuiConfig::get_config_file_path();
            let file = fs::File::open(path)?;
            let reader = io::BufReader::new(file);
            let value: serde_json::Value = serde_json::from_reader(reader)?;

            // get folders
            if let Some(folders_value) = value.get("recent_folders") {
                if let Some(folders) = folders_value.as_array() {
                    for folder_value in folders {
                        if let Ok(recent_folder) =
                            serde_json::from_value::<RecentFolder>(folder_value.to_owned())
                        {
                            self.recent_folders.push(recent_folder);
                        }
                    }
                }
            }

            // get log level
            if let Some(log_level_value) = value.get("log_level") {
                if let Some(log_level) = log_level_value.as_str() {
                    self.log_level = String::from(log_level);
                }
            }

            self.sort_recent_folders();
            self.add_loaded_recent_to_scope(app_handle);

            Ok(())
        }();
        if let Some(error) = load_result.err() {
            match error.kind() {
                io::ErrorKind::NotFound => (), // do nothing
                _ => message(
                    None::<&tauri::Window>,
                    MESSAGE_TITLE,
                    format!("Failed to load gui config: {}", error.to_string()),
                ),
            }
        }

        self.init = true;
    }

    pub fn save_config(&self) {
        let save_result = || -> Result<(), io::Error> {
            let path = GuiConfig::get_config_file_path();
            if let Some(folder) = path.parent() {
                fs::create_dir_all(folder)?;
            }
            let file = fs::File::create(path)?;
            let writer = io::BufWriter::new(file);
            serde_json::to_writer(writer, self)?;
            Ok(())
        }();
        if let Some(error) = save_result.err() {
            message(
                None::<&tauri::Window>,
                MESSAGE_TITLE,
                format!("Failed to save gui config: {}", error.to_string()),
            );
        }
    }

    pub fn get_recent_folders(&self) -> Vec<&String> {
        if self.check_if_init() {
            self.recent_folders
                .iter()
                .map(|recent_folder| &recent_folder.path)
                .collect()
        } else {
            Vec::new()
        }
    }

    pub fn get_most_recent_folder(&self) -> Option<&String> {
        if self.check_if_init() {
            if let Some(recent_folder) = self.recent_folders.first() {
                return Some(&recent_folder.path);
            }
        }
        None
    }

    pub fn add_recent_folder(&mut self, path: &str) {
        if !self.check_if_init() {
            return;
        }
        if let Some(recent_folder) = self
            .recent_folders
            .iter_mut()
            .find(|recent_folder| recent_folder.path.eq(path))
        {
            recent_folder.update_entry_date();
        } else {
            //  add the moment, a new folder is added to scope via dialog open
            self.recent_folders.push(RecentFolder::new(path));
        }
        self.sort_recent_folders(); // not really efficient

        if self.recent_folders.len() > NUMBER_OF_RECENT_FOLDERS {
            self.recent_folders.truncate(NUMBER_OF_RECENT_FOLDERS);
        }
    }

    pub fn remove_recent_folder(&mut self, path: &str) {
        if !self.check_if_init() {
            return;
        }
        // order is kept
        // there seems to be no way to remove allowed scopes, only forbid, but what is forbidden stays
        // during the programs lifetime
        self.recent_folders
            .retain(|recent_folder| !recent_folder.path.eq(path));
    }

    pub fn get_log_level(&self) -> Option<&String> {
        if self.check_if_init() {
            Some(&self.log_level)
        } else {
            None
        }
    }
}

// These functions are not async, and will run in the Rust main thread.
// It should therefore kinda behave like JS in a way.
// Truly async stuff (other thread) is possible by using "async"
// Currently it is not possible to delete enabled folders, and it will add the complete folder.

#[tauri::command]
fn get_config_recent_folders<R: Runtime>(app_handle: AppHandle<R>) -> Vec<String> {
    get_state_mutex_from_handle::<R, GuiConfig>(&app_handle)
        .get_recent_folders()
        .iter()
        .map(|path_ref| String::from(*path_ref))
        .collect()
}

#[tauri::command]
fn get_config_most_recent_folder<R: Runtime>(app_handle: AppHandle<R>) -> Option<String> {
    get_state_mutex_from_handle::<R, GuiConfig>(&app_handle)
        .get_most_recent_folder()
        .map(String::from)
}

#[tauri::command]
fn add_config_recent_folder<R: Runtime>(app_handle: AppHandle<R>, path: &str) {
    get_state_mutex_from_handle::<R, GuiConfig>(&app_handle).add_recent_folder(path);
}

#[tauri::command]
fn remove_config_recent_folder<R: Runtime>(app_handle: AppHandle<R>, path: &str) {
    get_state_mutex_from_handle::<R, GuiConfig>(&app_handle).remove_recent_folder(path);
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("tauri-plugin-ucp-config")
        .invoke_handler(tauri::generate_handler![
            get_config_recent_folders,
            get_config_most_recent_folder,
            add_config_recent_folder,
            remove_config_recent_folder,
        ])
        .setup(|app_handle| {
            app_handle.manage::<Mutex<GuiConfig>>(Mutex::new(GuiConfig::new()));
            Ok(())
        })
        .on_event(|app_handle: &AppHandle<R>, event| {
            match event {
                RunEvent::Ready {} => {
                    let mut gui_config = get_state_mutex_from_handle::<R, GuiConfig>(app_handle);
                    gui_config.load_saved_config(app_handle);

                    // set logging to config value
                    let log_handle = get_state_mutex_from_handle::<R, Handle>(app_handle);
                    logging::set_root_log_level_with_string(
                        app_handle,
                        &log_handle,
                        gui_config
                            .get_log_level()
                            .map_or("", |log_level| log_level.as_str()),
                    );
                }
                RunEvent::Exit {} => {
                    get_state_mutex_from_handle::<R, GuiConfig>(app_handle).save_config();
                }
                _ => {}
            }
        })
        .build()
}
