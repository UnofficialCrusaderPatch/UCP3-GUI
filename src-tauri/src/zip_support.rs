use std::{
    collections::HashMap,
    fs::{self, File},
    io::Read,
    pin::Pin,
    sync::Mutex,
    sync::MutexGuard,
};
use tauri::{
    plugin::{Builder, TauriPlugin},
    AppHandle, Manager, Runtime,
};
use zip::{result::ZipError, ZipArchive, ZipWriter};

use crate::utils::{get_allowed_path_with_string_error, get_state_mutex_from_handle};

struct ZipCollectionsState {
    reader: HashMap<usize, Pin<Box<ZipArchive<File>>>>,
    writer: HashMap<usize, Pin<Box<ZipWriter<File>>>>,
}

impl ZipCollectionsState {
    fn new() -> ZipCollectionsState {
        ZipCollectionsState {
            reader: HashMap::new(),
            writer: HashMap::new(),
        }
    }

    fn get_readers(&mut self) -> &mut HashMap<usize, Pin<Box<ZipArchive<File>>>> {
        &mut self.reader
    }

    fn get_writers(&mut self) -> &mut HashMap<usize, Pin<Box<ZipWriter<File>>>> {
        &mut self.writer
    }
}

fn get_zip_collections_state<R: Runtime>(
    app_handle: &AppHandle<R>,
) -> MutexGuard<ZipCollectionsState> {
    get_state_mutex_from_handle::<R, ZipCollectionsState>(&app_handle)
}

fn get_pin_box_mem_address<S>(obj: &Pin<Box<S>>) -> usize {
    &**obj as *const S as usize
}

fn do_with_zip<R: Runtime, Res, F>(
    app_handle: &AppHandle<R>,
    id: usize,
    mut do_with_zip: F,
) -> Result<Res, String>
where
    F: FnMut(&mut ZipArchive<File>) -> Result<Res, String>,
{
    let mut collections_state = get_zip_collections_state(app_handle);
    match collections_state.get_readers().get_mut(&id) {
        Some(archive) => do_with_zip(archive),
        None => Err(String::from("zip.id.missing")),
    }
}

#[tauri::command]
fn load_zip<R: Runtime>(app_handle: AppHandle<R>, source: &str) -> Result<usize, String> {
    let source_path = get_allowed_path_with_string_error(&app_handle, source)?;

    let mut collections_state = get_zip_collections_state(&app_handle);
    let create_result = || -> Result<usize, ZipError> {
        let file = fs::File::open(source_path)?;
        let archive = ZipArchive::new(file)?;
        let boxed_archive = Box::pin(archive);
        let address_id = get_pin_box_mem_address(&boxed_archive);
        collections_state.get_readers().insert(address_id, boxed_archive);
        Ok(address_id)
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
    let mut collections_state = get_zip_collections_state(&app_handle);
    match collections_state.get_readers().remove(&id) {
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
            app_handle.manage::<Mutex<ZipCollectionsState>>(Mutex::new(ZipCollectionsState::new()));
            Ok(())
        })
        .build()
}
