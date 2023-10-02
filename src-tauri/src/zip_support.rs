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

/// STATE OBJECT ///

struct ZipCollectionsState {
    reader: HashMap<usize, Pin<Box<ZipReaderHelper>>>,
    writer: HashMap<usize, Pin<Box<ZipWriterHelper>>>,
}

impl ZipCollectionsState {
    fn new() -> ZipCollectionsState {
        ZipCollectionsState {
            reader: HashMap::new(),
            writer: HashMap::new(),
        }
    }

    fn get_readers(&mut self) -> &mut HashMap<usize, Pin<Box<ZipReaderHelper>>> {
        &mut self.reader
    }

    fn get_writers(&mut self) -> &mut HashMap<usize, Pin<Box<ZipWriterHelper>>> {
        &mut self.writer
    }
}

/// HELPER ///

fn get_zip_collections_state<R: Runtime>(
    app_handle: &AppHandle<R>,
) -> MutexGuard<ZipCollectionsState> {
    get_state_mutex_from_handle::<R, ZipCollectionsState>(&app_handle)
}

fn get_pin_box_mem_address<S>(obj: &Pin<Box<S>>) -> usize {
    &**obj as *const S as usize
}

/// READER ///

struct ZipReaderHelper {
    id: usize,
    reader: ZipArchive<File>,
}

impl ZipReaderHelper {
    fn register_reader<R: Runtime>(app_handle: &AppHandle<R>, reader: ZipArchive<File>) -> usize {
        let helper = ZipReaderHelper {
            id: 0,
            reader: reader,
        };
        let mut boxed_helper = Box::pin(helper);

        let address_id = get_pin_box_mem_address(&boxed_helper);
        boxed_helper.id = address_id;

        get_zip_collections_state(app_handle)
            .get_readers()
            .insert(address_id, boxed_helper);

        address_id
    }

    fn free_reader<R: Runtime>(app_handle: &AppHandle<R>, id: usize) -> Result<(), String> {
        match get_zip_collections_state(app_handle)
            .get_readers()
            .remove(&id)
        {
            Some(_) => Ok(()),
            None => Err(String::from("zip.id.missing")),
        }
    }

    // can not take app handle, since handle mutex needs to be kept in outer scope
    fn get_reader(
        state: &mut ZipCollectionsState,
        id: usize,
    ) -> Result<&mut Pin<Box<ZipReaderHelper>>, String> {
        state
            .get_readers()
            .get_mut(&id)
            .ok_or(String::from("zip.id.missing"))
    }

    fn exist(&mut self, path: &str) -> bool {
        match self.reader.by_name(path) {
            Ok(_) => true,
            Err(_) => false,
        }
    }

    fn get_entry_as_binary(&mut self, path: &str) -> Result<Vec<u8>, String> {
        let read_result = || -> Result<Vec<u8>, ZipError> {
            let mut zip_file = self.reader.by_name(path)?;

            let mut vec_buf: Vec<u8> = Vec::new();
            zip_file.read_to_end(&mut vec_buf)?;
            Ok(vec_buf)
        }();
        read_result.map_err(|error| error.to_string())
    }

    fn get_entry_as_text(&mut self, path: &str) -> Result<String, String> {
        let read_result = || -> Result<String, ZipError> {
            let mut zip_file = self.reader.by_name(path)?;

            let mut string: String = String::new();
            zip_file.read_to_string(&mut string)?;
            Ok(string)
        }();
        read_result.map_err(|error| error.to_string())
    }
}

/// WRITER ///

struct ZipWriterHelper {
    id: usize,
    writer: Pin<Box<ZipWriter<File>>>,
}

// TODO

/// API ///

#[tauri::command]
fn load_zip_reader<R: Runtime>(app_handle: AppHandle<R>, source: &str) -> Result<usize, String> {
    let source_path = get_allowed_path_with_string_error(&app_handle, source)?;
    let create_result = || -> Result<usize, ZipError> {
        let file = fs::File::open(source_path)?;
        let archive = ZipArchive::new(file)?;
        Ok(ZipReaderHelper::register_reader(&app_handle, archive))
    }();
    create_result.map_err(|error| error.to_string())
}

#[tauri::command]
fn close_zip_reader<R: Runtime>(app_handle: AppHandle<R>, id: usize) -> Result<(), String> {
    ZipReaderHelper::free_reader(&app_handle, id)
}

#[tauri::command]
fn exist_zip_reader_entry<R: Runtime>(
    app_handle: AppHandle<R>,
    id: usize,
    path: &str,
) -> Result<bool, String> {
    let mut state = get_zip_collections_state(&app_handle);
    ZipReaderHelper::get_reader(&mut state, id).map(|reader| reader.exist(path))
}

#[tauri::command]
fn get_zip_reader_entry_as_binary<R: Runtime>(
    app_handle: AppHandle<R>,
    id: usize,
    path: &str,
) -> Result<Vec<u8>, String> {
    let mut state = get_zip_collections_state(&app_handle);
    ZipReaderHelper::get_reader(&mut state, id)?.get_entry_as_binary(path)
}

#[tauri::command]
fn get_zip_reader_entry_as_text<R: Runtime>(
    app_handle: AppHandle<R>,
    id: usize,
    path: &str,
) -> Result<String, String> {
    let mut state = get_zip_collections_state(&app_handle);
    ZipReaderHelper::get_reader(&mut state, id)?.get_entry_as_text(path)
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

/// INIT ///

pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("tauri-plugin-ucp-zip-support")
        .invoke_handler(tauri::generate_handler![
            extract_zip_to_path,
            load_zip_reader,
            close_zip_reader,
            exist_zip_reader_entry,
            get_zip_reader_entry_as_binary,
            get_zip_reader_entry_as_text
        ])
        .setup(|app_handle| {
            app_handle.manage::<Mutex<ZipCollectionsState>>(Mutex::new(ZipCollectionsState::new()));
            Ok(())
        })
        .build()
}
