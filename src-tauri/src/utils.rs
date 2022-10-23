use std::{sync::{Mutex, MutexGuard}, path::PathBuf};

use tauri::{AppHandle, Manager, State};

// CONSTANTS

const BASE_FOLDER: &str = "UnofficialCrusaderPatch3";

// will panic if not present, but state should exists
pub fn do_with_mutex_state<T: std::marker::Send + 'static>(
    app_handle: &AppHandle,
    do_with_state: fn(app_handle: &AppHandle, state: &mut MutexGuard<T>),
) {
    let state: State<Mutex<T>> = app_handle.state();
    do_with_state(app_handle, &mut state.lock().unwrap());
}


pub fn get_roaming_folder_path() -> PathBuf {
    let mut data_path = tauri::api::path::data_dir().unwrap();  // fail if not there
    data_path.push(BASE_FOLDER);
    data_path
}