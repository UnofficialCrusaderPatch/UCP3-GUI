use std::{
    collections::HashMap,
    fs::{self, File},
    io::Read,
    sync::atomic::{AtomicUsize, Ordering},
    sync::Mutex,
};
use tauri::{
    plugin::{Builder, TauriPlugin},
    AppHandle, Manager, Runtime,
};
use zip::{result::ZipError, ZipArchive};

use crate::utils::{get_allowed_path_with_string_error, get_state_mutex_from_handle};

// if zips are properly released, this should never run into issues
// however, if one is kept, this run into "theoretical" issues
static ID_KEEPER: AtomicUsize = AtomicUsize::new(0);
fn get_id() -> usize {
    ID_KEEPER.fetch_add(1, Ordering::Relaxed)
}

fn do_with_zip<R: Runtime, Res, F>(
    app_handle: &AppHandle<R>,
    id: usize,
    mut do_with_zip: F,
) -> Result<Res, String>
where
    F: FnMut(&mut ZipArchive<File>) -> Result<Res, String>,
{
    let mut map = get_state_mutex_from_handle::<R, HashMap<usize, ZipArchive<File>>>(app_handle);
    match map.get_mut(&id) {
        Some(archive) => do_with_zip(archive),
        None => Err(String::from("zip.id.missing")),
    }
}

#[tauri::command]
fn load_zip<R: Runtime>(app_handle: AppHandle<R>, source: &str) -> Result<usize, String> {
    let source_path = get_allowed_path_with_string_error(&app_handle, source)?;

    let mut map = get_state_mutex_from_handle::<R, HashMap<usize, ZipArchive<File>>>(&app_handle);
    let id = get_id();
    if map.contains_key(&id) {
        return Err(String::from("zip.id.present"));
    }
    let create_result = || -> Result<usize, ZipError> {
        let file = fs::File::open(source_path)?;
        let archive = ZipArchive::new(file)?;
        map.insert(id, archive);
        Ok(id)
    }();
    create_result.map_err(|error| error.to_string())
}

#[tauri::command]
fn exist_zip_entry<R: Runtime>(
    app_handle: AppHandle<R>,
    id: usize,
    path: &str,
) -> Result<bool, String> {
    do_with_zip(&app_handle, id, |archive| match archive.by_name(path) {
        Ok(_) => Ok(true),
        Err(_) => Ok(false),
    })
}

#[tauri::command]
fn get_zip_entry_as_binary<R: Runtime>(
    app_handle: AppHandle<R>,
    id: usize,
    path: &str,
) -> Result<Vec<u8>, String> {
    do_with_zip(&app_handle, id, |archive| {
        let read_result = || -> Result<Vec<u8>, ZipError> {
            let mut zip_file = archive.by_name(path)?;

            let mut vec_buf: Vec<u8> = Vec::new();
            zip_file.read_to_end(&mut vec_buf)?;
            Ok(vec_buf)
        }();
        read_result.map_err(|error| error.to_string())
    })
}

#[tauri::command]
fn get_zip_entry_as_text<R: Runtime>(
    app_handle: AppHandle<R>,
    id: usize,
    path: &str,
) -> Result<String, String> {
    do_with_zip(&app_handle, id, |archive| {
        let read_result = || -> Result<String, ZipError> {
            let mut zip_file = archive.by_name(path)?;

            let mut string: String = String::new();
            zip_file.read_to_string(&mut string)?;
            Ok(string)
        }();
        read_result.map_err(|error| error.to_string())
    })
}

#[tauri::command]
fn close_zip<R: Runtime>(app_handle: AppHandle<R>, id: usize) -> Result<(), String> {
    let mut map = get_state_mutex_from_handle::<R, HashMap<usize, ZipArchive<File>>>(&app_handle);
    match map.remove(&id) {
        Some(_) => Ok(()),
        None => Err(String::from("zip.id.missing")),
    }
}

// careless, overwrites, may leave remains on error
// async (other thread), since it does not care about other stuff
#[tauri::command]
async fn extract_zip_to_path<R: Runtime>(
    app_handle: AppHandle<R>,
    source: &str,
    dest: &str,
) -> Result<(), String> {
    let source_path = get_allowed_path_with_string_error(&app_handle, source)?;
    let dist_path = get_allowed_path_with_string_error(&app_handle, dest)?;

    let extract_result = || -> Result<(), ZipError> {
        let file = fs::File::open(source_path)?;
        let mut archive = ZipArchive::new(file)?;
        archive.extract(dist_path)
    }();
    extract_result.map_err(|error| error.to_string())
}

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("tauri-plugin-ucp-zip-support")
        .invoke_handler(tauri::generate_handler![
            extract_zip_to_path,
            load_zip,
            close_zip,
            exist_zip_entry,
            get_zip_entry_as_binary,
            get_zip_entry_as_text
        ])
        .setup(|app_handle| {
            app_handle
                .manage::<Mutex<HashMap<usize, ZipArchive<File>>>>(Mutex::new(HashMap::new()));
            Ok(())
        })
        .build()
}
