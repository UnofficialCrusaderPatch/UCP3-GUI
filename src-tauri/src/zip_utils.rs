use std::{
    collections::HashMap,
    fs::{self, File},
    io::Read,
    sync::atomic::{AtomicUsize, Ordering},
};
use tauri::AppHandle;
use zip::{result::ZipError, ZipArchive};

use crate::utils::{do_with_mutex_state, get_allowed_path_with_string_error};

// if zips are properly released, this should never run into issues
// however, if one is kept, this run into "theoretical" issues
static ID_KEEPER: AtomicUsize = AtomicUsize::new(0);
fn get_id() -> usize {
    ID_KEEPER.fetch_add(1, Ordering::Relaxed)
}

fn do_with_zip<R, F>(app_handle: &AppHandle, id: usize, mut do_with_zip: F) -> Result<R, String>
where
    F: FnMut(&mut ZipArchive<File>) -> Result<R, String>,
{
    let mut result = Err(String::from("zip.id.missing"));
    do_with_mutex_state::<HashMap<usize, ZipArchive<File>>, _>(&app_handle, |map| {
        if let Some(archive) = map.get_mut(&id) {
            result = do_with_zip(archive);
        }
    });
    result
}

#[tauri::command]
pub fn load_zip(app_handle: AppHandle, source: &str) -> Result<usize, String> {
    let source_path = get_allowed_path_with_string_error(&app_handle, source)?;

    let mut result = Err(String::from("zip.id.present"));
    do_with_mutex_state::<HashMap<usize, ZipArchive<File>>, _>(&app_handle, |map| {
        let id = get_id();
        if map.contains_key(&id) {
            return;
        }
        let create_result = || -> Result<usize, ZipError> {
            let file = fs::File::open(source_path)?;
            let archive = ZipArchive::new(file)?;
            map.insert(id, archive);
            Ok(id)
        }();
        result = create_result.map_err(|error| error.to_string());
    });
    result
}

#[tauri::command]
pub fn exist_zip_entry(app_handle: AppHandle, id: usize, path: &str) -> Result<bool, String> {
    do_with_zip(&app_handle, id, |archive| {
        if let Some(_error) = archive.by_name(path).err() {
            return Ok(false);
        }
        Ok(true)
    })
}

#[tauri::command]
pub fn get_zip_entry_as_binary(
    app_handle: AppHandle,
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
pub fn get_zip_entry_as_text(
    app_handle: AppHandle,
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
pub fn close_zip(app_handle: AppHandle, id: usize) -> Result<(), String> {
    let mut result = Ok(());
    do_with_mutex_state::<HashMap<usize, ZipArchive<File>>, _>(&app_handle, |map| {
        if let None = map.remove(&id) {
            result = Err(String::from("zip.id.missing"));
        }
    });
    result
}

// careless, overwrites, may leave remains on error
// async (other thread), since it does not care about other stuff
#[tauri::command]
pub async fn extract_zip_to_path(app_handle: AppHandle, source: &str, dest: &str) -> Result<(), String> {
    let source_path = get_allowed_path_with_string_error(&app_handle, source)?;
    let dist_path = get_allowed_path_with_string_error(&app_handle, dest)?;

    let extract_result = || -> Result<(), ZipError> {
        let file = fs::File::open(source_path)?;
        let mut archive = ZipArchive::new(file)?;
        archive.extract(dist_path)
    }();
    if let Some(error) = extract_result.err() {
        return Err(error.to_string());
    }
    Ok(())
}
