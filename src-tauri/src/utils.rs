use std::{
    path::{Path, PathBuf},
    sync::{Mutex, MutexGuard},
};
use tauri::{AppHandle, Error, Manager, Runtime, State};
use tauri_plugin_fs::FsExt;

use crate::constants::BASE_FOLDER;

/// General error to control serialization
///
/// source: https://tauri.app/v1/guides/features/command/#error-handling
#[derive(Debug, thiserror::Error)]
pub enum GuiError {
    #[error(transparent)]
    Io(#[from] std::io::Error),

    #[error(transparent)]
    Tauri(#[from] tauri::Error),
}

// we must manually implement serde::Serialize
impl serde::Serialize for GuiError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::ser::Serializer,
    {
        // currently to string
        serializer.serialize_str(self.to_string().as_ref())
    }
}

// will panic if not present, but state should exists
#[allow(dead_code)]
pub fn do_with_mutex_state<R: Runtime, T: std::marker::Send + 'static, F>(
    app_handle: &AppHandle<R>,
    mut do_with_state: F,
) where
    F: FnMut(&mut MutexGuard<T>) -> (),
{
    let state: State<Mutex<T>> = app_handle.state();
    do_with_state(&mut state.lock().unwrap());
}

// will panic if not present, but state should exists
#[allow(dead_code)]
pub fn get_state_mutex<'a, T: std::marker::Send + 'static>(
    state: &'a State<'a, Mutex<T>>,
) -> MutexGuard<'a, T> {
    state.lock().unwrap()
}

// will panic if not present, but state should exists
pub fn get_state_mutex_from_handle<R: Runtime, T: std::marker::Send + 'static>(
    app_handle: &AppHandle<R>,
) -> MutexGuard<T> {
    app_handle.state::<Mutex<T>>().inner().lock().unwrap()
}

pub fn get_roaming_folder_path() -> PathBuf {
    let mut data_path = dirs::data_dir().unwrap(); // fail if not there
    data_path.push(BASE_FOLDER);
    data_path
}

pub fn get_allowed_path<'a, R: Runtime>(
    app_handle: &AppHandle<R>,
    path: &'a str,
) -> Result<&'a Path, Error> {
    let path_object = Path::new(path);
    if app_handle.fs_scope().is_allowed(path_object) {
        Ok(path_object)
    } else {
        // `tauri::Error::PathNotAllowed` was removed in Tauri v2; keep the v1 message
        Err(Error::Io(std::io::Error::new(
            std::io::ErrorKind::PermissionDenied,
            format!("path not allowed on the configured scope: {}", path_object.display()),
        )))
    }
}

pub fn get_allowed_path_with_string_error<'a, R: Runtime>(
    app_handle: &AppHandle<R>,
    path: &'a str,
) -> Result<&'a Path, String> {
    let result = get_allowed_path(app_handle, path);
    match result {
        Ok(path) => Ok(path),
        Err(error) => Err(error.to_string()),
    }
}
