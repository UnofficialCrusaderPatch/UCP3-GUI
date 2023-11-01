use std::{
    collections::HashMap,
    fs::{self, File},
    io::{self, BufReader, BufWriter, Read, Write},
    path::Path,
    pin::Pin,
    sync::Mutex,
    sync::MutexGuard,
};
use tauri::{
    plugin::{Builder, TauriPlugin},
    scope::GlobPattern,
    AppHandle, Manager, Runtime,
};
use zip::{result::ZipError, write::FileOptions, ZipArchive, ZipWriter};

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

fn do_with_reader<R: Runtime, T, F: FnOnce(&mut Pin<Box<ZipReaderHelper>>) -> Result<T, String>>(
    app_handle: &AppHandle<R>,
    id: usize,
    func: F,
) -> Result<T, String> {
    let mut state = get_zip_collections_state(&app_handle);
    ZipReaderHelper::get_reader(&mut state, id).and_then(func)
}

fn do_with_writer<R: Runtime, T, F: FnOnce(&mut Pin<Box<ZipWriterHelper>>) -> Result<T, String>>(
    app_handle: &AppHandle<R>,
    id: usize,
    func: F,
) -> Result<T, String> {
    let mut state: MutexGuard<'_, ZipCollectionsState> = get_zip_collections_state(&app_handle);
    ZipWriterHelper::get_writer(&mut state, id).and_then(func)
}

/// READER ///

struct ZipReaderHelper {
    id: usize,
    reader: ZipArchive<BufReader<File>>,
}

impl ZipReaderHelper {
    fn register_reader<R: Runtime>(
        app_handle: &AppHandle<R>,
        reader: ZipArchive<BufReader<File>>,
    ) -> usize {
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

    fn is_empty(&self) -> bool {
        self.reader.is_empty()
    }

    fn get_number_of_entries(&self) -> usize {
        self.reader.len()
    }

    fn exist(&mut self, path: &str) -> bool {
        match self.reader.by_name(path) {
            Ok(_) => true,
            Err(_) => false,
        }
    }

    fn get_entry_names(&mut self, pattern: &str) -> Result<Vec<String>, String> {
        if pattern.is_empty() {
            return Ok(self.reader.file_names().map(String::from).collect());
        }
        let glob_pattern = GlobPattern::new(pattern).map_err(|err| err.to_string())?;
        Ok(self
            .reader
            .file_names()
            .filter(|file_name| glob_pattern.matches(file_name))
            .map(String::from)
            .collect())
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
    writer: ZipWriter<BufWriter<File>>,
}

impl ZipWriterHelper {
    fn register_writer<R: Runtime>(
        app_handle: &AppHandle<R>,
        writer: ZipWriter<BufWriter<File>>,
    ) -> usize {
        let helper = ZipWriterHelper {
            id: 0,
            writer: writer,
        };
        let mut boxed_helper = Box::pin(helper);

        let address_id = get_pin_box_mem_address(&boxed_helper);
        boxed_helper.id = address_id;

        get_zip_collections_state(app_handle)
            .get_writers()
            .insert(address_id, boxed_helper);

        address_id
    }

    fn free_writer<R: Runtime>(app_handle: &AppHandle<R>, id: usize) -> Result<(), String> {
        get_zip_collections_state(app_handle)
            .get_writers()
            .remove(&id)
            .ok_or(String::from("zip.id.missing"))?
            .writer
            .finish()
            .map(|mut buf_writer| buf_writer.flush())
            .map_err(|err| err.to_string())
            .map(|_| ())
    }

    // can not take app handle, since handle mutex needs to be kept in outer scope
    fn get_writer(
        state: &mut ZipCollectionsState,
        id: usize,
    ) -> Result<&mut Pin<Box<ZipWriterHelper>>, String> {
        state
            .get_writers()
            .get_mut(&id)
            .ok_or(String::from("zip.id.missing"))
    }

    fn add_directory(&mut self, path: &str) -> Result<(), String> {
        self.writer
            .add_directory(path, FileOptions::default())
            .map_err(|err| err.to_string())
    }

    fn write_entry_from_binary(&mut self, path: &str, binary: &[u8]) -> Result<(), String> {
        let write_result = || -> Result<(), ZipError> {
            self.writer.start_file(path, FileOptions::default())?;
            self.writer.write_all(binary)?;
            Ok(())
        }();
        write_result.map_err(|error| error.to_string())
    }

    fn write_entry_from_text(&mut self, path: &str, text: &str) -> Result<(), String> {
        self.write_entry_from_binary(path, text.as_bytes())
    }

    // WARNING: There is no same file check, so this might fill until out of space or memory if it points to the same
    // alternative would be an endless loop...
    fn write_entry_from_file(&mut self, path: &str, source_path: &Path) -> Result<(), String> {
        let create_result = || -> Result<(), io::Error> {
            let file: File = File::open(source_path)?;
            let mut buf_reader = BufReader::new(file);
            self.writer.start_file(path, FileOptions::default())?;
            io::copy(&mut buf_reader, &mut self.writer).map(|_| ())
        }();
        create_result.map_err(|error| error.to_string())
    }
}

/// API ///

#[tauri::command]
fn load_zip_reader<R: Runtime>(app_handle: AppHandle<R>, source: &str) -> Result<usize, String> {
    let source_path = get_allowed_path_with_string_error(&app_handle, source)?;
    let create_result = || -> Result<usize, ZipError> {
        let file = File::open(source_path)?;
        let buf_reader = BufReader::new(file);
        let reader = ZipArchive::new(buf_reader)?;
        Ok(ZipReaderHelper::register_reader(&app_handle, reader))
    }();
    create_result.map_err(|error| error.to_string())
}

#[tauri::command]
fn close_zip_reader<R: Runtime>(app_handle: AppHandle<R>, id: usize) -> Result<(), String> {
    ZipReaderHelper::free_reader(&app_handle, id)
}

#[tauri::command]
fn is_zip_reader_empty<R: Runtime>(app_handle: AppHandle<R>, id: usize) -> Result<bool, String> {
    do_with_reader(&app_handle, id, |reader| Ok(reader.is_empty()))
}

#[tauri::command]
fn get_zip_reader_number_of_entries<R: Runtime>(
    app_handle: AppHandle<R>,
    id: usize,
) -> Result<usize, String> {
    do_with_reader(&app_handle, id, |reader| Ok(reader.get_number_of_entries()))
}

#[tauri::command]
fn exist_zip_reader_entry<R: Runtime>(
    app_handle: AppHandle<R>,
    id: usize,
    path: &str,
) -> Result<bool, String> {
    do_with_reader(&app_handle, id, |reader| Ok(reader.exist(path)))
}

#[tauri::command]
fn get_zip_reader_entry_names<R: Runtime>(
    app_handle: AppHandle<R>,
    id: usize,
    pattern: &str,
) -> Result<Vec<String>, String> {
    // no idea how lifetime params could be set to avoid creating the string copies...
    do_with_reader(&app_handle, id, |reader| reader.get_entry_names(pattern))
}

#[tauri::command]
fn get_zip_reader_entry_as_binary<R: Runtime>(
    app_handle: AppHandle<R>,
    id: usize,
    path: &str,
) -> Result<Vec<u8>, String> {
    do_with_reader(&app_handle, id, |reader| reader.get_entry_as_binary(path))
}

#[tauri::command]
fn get_zip_reader_entry_as_text<R: Runtime>(
    app_handle: AppHandle<R>,
    id: usize,
    path: &str,
) -> Result<String, String> {
    do_with_reader(&app_handle, id, |reader| reader.get_entry_as_text(path))
}

#[tauri::command]
fn load_zip_writer<R: Runtime>(app_handle: AppHandle<R>, source: &str) -> Result<usize, String> {
    let source_path = get_allowed_path_with_string_error(&app_handle, source)?;
    let create_result = || -> Result<usize, ZipError> {
        let file = File::create(source_path)?;
        let buf_writer = BufWriter::new(file);
        let writer = ZipWriter::new(buf_writer);
        Ok(ZipWriterHelper::register_writer(&app_handle, writer))
    }();
    create_result.map_err(|error| error.to_string())
}

#[tauri::command]
fn close_zip_writer<R: Runtime>(app_handle: AppHandle<R>, id: usize) -> Result<(), String> {
    ZipWriterHelper::free_writer(&app_handle, id)
}

#[tauri::command]
fn add_zip_writer_directory<R: Runtime>(
    app_handle: AppHandle<R>,
    id: usize,
    path: &str,
) -> Result<(), String> {
    do_with_writer(&app_handle, id, |writer| writer.add_directory(path))
}

#[tauri::command]
fn write_zip_writer_entry_from_binary<R: Runtime>(
    app_handle: AppHandle<R>,
    id: usize,
    path: &str,
    binary: &[u8],
) -> Result<(), String> {
    do_with_writer(&app_handle, id, |writer| {
        writer.write_entry_from_binary(path, binary)
    })
}

#[tauri::command]
fn write_zip_writer_entry_from_text<R: Runtime>(
    app_handle: AppHandle<R>,
    id: usize,
    path: &str,
    text: &str,
) -> Result<(), String> {
    do_with_writer(&app_handle, id, |writer| {
        writer.write_entry_from_text(path, text)
    })
}

#[tauri::command]
fn write_zip_writer_entry_from_file<R: Runtime>(
    app_handle: AppHandle<R>,
    id: usize,
    path: &str,
    source: &str,
) -> Result<(), String> {
    let source_path = get_allowed_path_with_string_error(&app_handle, source)?;
    do_with_writer(&app_handle, id, |writer| {
        writer.write_entry_from_file(path, source_path)
    })
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
            is_zip_reader_empty,
            get_zip_reader_number_of_entries,
            exist_zip_reader_entry,
            get_zip_reader_entry_names,
            get_zip_reader_entry_as_binary,
            get_zip_reader_entry_as_text,
            load_zip_writer,
            close_zip_writer,
            add_zip_writer_directory,
            write_zip_writer_entry_from_binary,
            write_zip_writer_entry_from_text,
            write_zip_writer_entry_from_file
        ])
        .setup(|app_handle| {
            app_handle.manage::<Mutex<ZipCollectionsState>>(Mutex::new(ZipCollectionsState::new()));
            Ok(())
        })
        .build()
}
