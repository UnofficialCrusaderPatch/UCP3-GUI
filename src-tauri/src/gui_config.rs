use serde::{Deserialize, Serialize};
use std::{
    fs, io,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{api::dialog::message, AppHandle, Manager};

use super::utils::get_roaming_folder_path;

const NUMBER_OF_RECENT_FOLDERS: usize = 10;
const CONFIG_FILE_NAME: &str = "recent.json";
const MESSAGE_TITLE: &str = "GUI-Configuration";

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

    lang: String,
    recent_folders: Vec<RecentFolder>,
}

impl GuiConfig {
    fn get_config_file_path() -> PathBuf {
        let mut path = get_roaming_folder_path(); // simply crashes on error
        path.push(CONFIG_FILE_NAME);
        path
    }

    fn sort_recent_folders(&mut self) {
        self.recent_folders.sort_by(|a, b| b.date.cmp(&a.date));
    }

    pub fn new() -> GuiConfig {
        GuiConfig {
            init: false,
            lang: String::from("en"),
            recent_folders: Vec::with_capacity(NUMBER_OF_RECENT_FOLDERS),
        }
    }

    pub fn load_saved_config(&mut self, app_handle: &AppHandle) {
        let load_result = || -> Result<(), io::Error> {
            let path = GuiConfig::get_config_file_path();
            let file = fs::File::open(path)?;
            let reader = io::BufReader::new(file);
            let value: serde_json::Value = serde_json::from_reader(reader)?;

            // get lang
            if let Some(lang_value) = value.get("language") {
                if let Some(lang) = lang_value.as_str() {
                    self.lang = String::from(lang);
                }
            }

            // get folders
            if let Some(folders_value) = value.get("recentFolderPaths") {
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
        self.sort_recent_folders();

        self.init = true;
    }

    pub fn save_config(&self) {
        let save_result = || -> Result<(), io::Error> {
            let path = GuiConfig::get_config_file_path();
            let folder = path.parent().unwrap();
            fs::create_dir_all(folder)?;
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
}

// This function is not async, and will run in the Rust main thread.
// It should therefore kinda behave like JS in a way.
// Truly async stuff (other thread) is possible by using "async"
// Currently it is not possible to delete them, and it will add the complete folder.
#[tauri::command]
pub fn add_dir_to_fs_scope(app_handle: tauri::AppHandle, path: &str) -> Result<(), tauri::Error> {
    app_handle.fs_scope().allow_directory(path, true)
}
