use log::error;
use log4rs::Handle;
use path_slash::PathBufExt;
use serde::{Deserialize, Serialize};
use std::{
    fs, io,
    path::PathBuf,
    sync::Mutex,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::{
    api::dialog,
    plugin::{Builder, TauriPlugin},
    AppHandle, Manager, RunEvent, Runtime, Window,
};

use crate::{
    constants::{
        CONFIG_FILE_NAME, FILE_CONFIG_EVENT, FILE_CONFIG_EVENT_LOG_CHANGED,
        FILE_CONFIG_EVENT_RECENT_FOLDER_CHANGED, LOG_LEVEL_DEFAULT, NUMBER_OF_RECENT_FOLDERS,
    },
    logging,
    utils::{get_roaming_folder_path, get_state_mutex_from_handle, GuiError},
};

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
struct GuiConfig<R: Runtime> {
    #[serde(skip_serializing)]
    app_handle: AppHandle<R>,

    recent_folders: Vec<RecentFolder>,
    log_level: String,
}

#[derive(Serialize, Clone)]
struct ConfigEvent {
    event_type: String,
}

impl<R: Runtime> GuiConfig<R> {
    fn emit_config_event(&self, event_type: &str) {
        if let Err(err) = self.app_handle.emit_all::<ConfigEvent>(
            FILE_CONFIG_EVENT,
            ConfigEvent {
                event_type: event_type.to_string(),
            },
        ) {
            error!(
                "Failed to emit config event '{}' because of error: {}",
                event_type, err
            );
        };
    }

    fn get_config_file_path(&self) -> PathBuf {
        let mut path = get_roaming_folder_path(); // simply crashes on error
        path.push(CONFIG_FILE_NAME);
        path
    }

    fn sort_recent_folders(&mut self) {
        self.recent_folders.sort_by(|a, b| b.date.cmp(&a.date));
    }

    fn add_folder_to_scopes(&self, path: &str) -> Result<(), GuiError> {
        self.app_handle.fs_scope().allow_directory(path, true)?;
        self.app_handle
            .asset_protocol_scope()
            .allow_directory(path, true)?;
        Ok(())
    }

    pub fn new(app_handle: &AppHandle<R>) -> GuiConfig<R> {
        GuiConfig {
            app_handle: app_handle.to_owned(),
            recent_folders: Vec::with_capacity(NUMBER_OF_RECENT_FOLDERS),
            log_level: String::from(LOG_LEVEL_DEFAULT),
        }
    }

    pub fn load_saved_config(&mut self) {
        let load_result = || -> Result<(), io::Error> {
            let path = self.get_config_file_path();
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
                    self.set_log_level(&log_level); // also emits event
                }
            }

            self.sort_recent_folders();
            for recent_folder in &self.recent_folders {
                if let Err(err) = self.add_folder_to_scopes(&recent_folder.path) {
                    error!(
                        "Failed to add path '{}' to scopes: {}",
                        recent_folder.path, err
                    );
                }
            }
            // emit always, since there might always be a change performed
            self.emit_config_event(FILE_CONFIG_EVENT_RECENT_FOLDER_CHANGED);

            Ok(())
        }();
        if let Some(error) = load_result.err() {
            match error.kind() {
                io::ErrorKind::NotFound => (), // do nothing
                _ => error!("Failed to load gui config: {}", error),
            }
        }
    }

    pub fn save_config(&self) {
        let save_result = || -> Result<(), io::Error> {
            let path = self.get_config_file_path();
            if let Some(folder) = path.parent() {
                fs::create_dir_all(folder)?;
            }
            let file = fs::File::create(path)?;
            let writer = io::BufWriter::new(file);
            serde_json::to_writer(writer, self)?;
            Ok(())
        }();
        if let Some(error) = save_result.err() {
            error!("Failed to save gui config: {}", error);
        }
    }

    pub fn get_recent_folders(&self) -> Vec<&String> {
        self.recent_folders
            .iter()
            .map(|recent_folder| &recent_folder.path)
            .collect()
    }

    /// I set to new, Launches a blocking file dialog and needs to be called in an async thread.
    pub fn select_recent_folder(
        &mut self,
        window: &Window<R>,
        directory_path: &str,
        new: bool,
        title: &str,
    ) -> Result<Option<String>, GuiError> {
        let selected_folder_option = if new {
            let mut folder_picker = dialog::blocking::FileDialogBuilder::new().set_parent(window);
            if !title.is_empty() {
                folder_picker = folder_picker.set_title(title);
            }
            if !directory_path.is_empty() {
                folder_picker = folder_picker.set_directory(directory_path);
            }
            folder_picker
                .pick_folder()
                .and_then(|path| path.to_slash().map(String::from))
        } else if !directory_path.is_empty() {
            Some(directory_path.to_string())
        } else {
            None
        };

        let selected_folder = if let Some(path) = selected_folder_option {
            path
        } else {
            return Ok(None);
        };

        if let Some(recent_folder) = self
            .recent_folders
            .iter_mut()
            .find(|recent_folder| recent_folder.path.eq(&selected_folder))
        {
            recent_folder.update_entry_date();
        } else if new {
            self.add_folder_to_scopes(&selected_folder)?;
            self.recent_folders
                .push(RecentFolder::new(&selected_folder));
        } else {
            return Ok(None);
        }

        self.sort_recent_folders();
        if self.recent_folders.len() > NUMBER_OF_RECENT_FOLDERS {
            self.recent_folders.truncate(NUMBER_OF_RECENT_FOLDERS);
        }
        self.emit_config_event(FILE_CONFIG_EVENT_RECENT_FOLDER_CHANGED);
        Ok(Some(selected_folder))
    }

    pub fn remove_recent_folder(&mut self, path: &str) {
        // order is kept
        // there seems to be no way to remove allowed scopes, only forbid, but what is forbidden stays
        // during the programs lifetime
        self.recent_folders
            .retain(|recent_folder| !recent_folder.path.eq(path));
        self.emit_config_event(FILE_CONFIG_EVENT_RECENT_FOLDER_CHANGED);
    }

    pub fn get_log_level(&self) -> &str {
        &self.log_level
    }

    pub fn set_log_level(&mut self, log_level: &str) {
        let real_log_level = logging::get_level_or_default_from_string(log_level);
        self.log_level = real_log_level.to_string();
        // set logging to config value
        let log_handle = get_state_mutex_from_handle::<R, Handle>(&self.app_handle);
        logging::set_root_log_level(&self.app_handle, &log_handle, real_log_level);

        self.emit_config_event(FILE_CONFIG_EVENT_LOG_CHANGED);
    }
}

#[tauri::command]
fn get_config_recent_folders<R: Runtime>(app_handle: AppHandle<R>) -> Vec<String> {
    get_state_mutex_from_handle::<R, GuiConfig<R>>(&app_handle)
        .get_recent_folders()
        .iter()
        .map(|path_ref| String::from(*path_ref))
        .collect()
}

// real async to allow execution of blocking file open
#[tauri::command]
async fn select_config_recent_folder<R: Runtime>(
    app_handle: AppHandle<R>,
    window: Window<R>,
    directory_path: String,
    new: bool,
    title: String,
) -> Result<Option<String>, GuiError> {
    get_state_mutex_from_handle::<R, GuiConfig<R>>(&app_handle).select_recent_folder(
        &window,
        &directory_path,
        new,
        &title,
    )
}

// Currently it seems not possible to remove enabled folders from the allowlist,
// so this will only remove it from the listing.
#[tauri::command]
fn remove_config_recent_folder<R: Runtime>(app_handle: AppHandle<R>, path: &str) {
    get_state_mutex_from_handle::<R, GuiConfig<R>>(&app_handle).remove_recent_folder(path);
}

#[tauri::command]
fn get_config_log_level<R: Runtime>(app_handle: AppHandle<R>) -> String {
    get_state_mutex_from_handle::<R, GuiConfig<R>>(&app_handle)
        .get_log_level()
        .to_string()
}

#[tauri::command]
fn set_config_log_level<R: Runtime>(app_handle: AppHandle<R>, log_level: &str) {
    get_state_mutex_from_handle::<R, GuiConfig<R>>(&app_handle).set_log_level(log_level);
}

#[tauri::command]
fn save_config<R: Runtime>(app_handle: AppHandle<R>) {
    get_state_mutex_from_handle::<R, GuiConfig<R>>(&app_handle).save_config();
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("tauri-plugin-ucp-config")
        .invoke_handler(tauri::generate_handler![
            get_config_recent_folders,
            select_config_recent_folder,
            remove_config_recent_folder,
            get_config_log_level,
            set_config_log_level,
            save_config
        ])
        .setup(|app_handle| {
            app_handle.manage::<Mutex<GuiConfig<R>>>(Mutex::new(GuiConfig::new(app_handle)));
            Ok(())
        })
        .on_event(|app_handle: &AppHandle<R>, event| match event {
            RunEvent::Ready {} => {
                get_state_mutex_from_handle::<R, GuiConfig<R>>(app_handle).load_saved_config()
            }
            _ => {}
        })
        .build()
}
