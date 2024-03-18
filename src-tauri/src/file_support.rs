use path_slash::{PathBufExt, PathExt};
use std::{
    fs::File,
    io::{self, Read},
    path::Path,
};
use tauri::{
    api::dir::{read_dir, DiskEntry},
    scope::GlobPattern,
    AppHandle, FsScope, Manager,
};

use crate::{
    constants::PATH_MATCH_OPTIONS,
    utils::{get_allowed_path, get_allowed_path_with_string_error},
};

fn fill_with_paths_with_slash(
    fs_scope: &FsScope,
    disk_entries: &Vec<DiskEntry>,
    fill_container: &mut Vec<String>,
) {
    for entry in disk_entries {
        if fs_scope.is_allowed(&entry.path) {
            if let Some(path_string) = entry.path.to_slash() {
                fill_container.push(path_string.to_string());
            }
        }
        if let Some(children) = &entry.children {
            fill_with_paths_with_slash(fs_scope, children, fill_container);
        }
    }
}

// the method will only return paths with the unix separator
#[tauri::command]
pub async fn read_and_filter_dir(
    app_handle: AppHandle,
    base: &str,
    pattern: &str,
) -> Result<Vec<String>, String> {
    let base_path = match get_allowed_path(&app_handle, base) {
        Ok(path) => {
            if path.exists() {
                path
            } else {
                return Ok(vec![]);
            }
        }
        Err(_err) => return Ok(vec![]),
    };
    let path = dunce::canonicalize(base_path).map_err(|err| err.to_string())?;

    let found_entries = read_dir(path, true).map_err(|err| err.to_string())?;
    let mut found_paths = vec![];
    fill_with_paths_with_slash(&app_handle.fs_scope(), &found_entries, &mut found_paths);

    if !pattern.is_empty() {
        let glob_pattern = GlobPattern::new(pattern).map_err(|err| err.to_string())?;
        found_paths.retain(|path_string: &String| {
            glob_pattern.matches_with(path_string, PATH_MATCH_OPTIONS)
        });
    }
    Ok(found_paths)
}

fn slashify_path(path: &Path) -> Result<String, String> {
    path.to_slash().map_or_else(
        || Err(String::from("Unable to slashify path.")),
        |path_slash| Ok(path_slash.to_string()),
    )
}

// changes path to use slash as separator
#[tauri::command]
pub async fn slashify(path: &str) -> Result<String, String> {
    slashify_path(Path::new(path))
}

// changes path to use slash as separator
#[tauri::command]
pub async fn canonicalize(
    app_handle: AppHandle,
    path: &str,
    slash: bool,
) -> Result<String, String> {
    let validated_path = get_allowed_path_with_string_error(&app_handle, path)?;
    let canonical_path = dunce::canonicalize(validated_path).map_err(|err| err.to_string())?;
    if slash {
        slashify_path(&canonical_path)
    } else {
        canonical_path.to_str().map_or_else(
            || Err(String::from("Unable to canonicalize path.")),
            |canonical_path_str| Ok(canonical_path_str.to_string()),
        )
    }
}

// searches for a sequence of bytes in a file
// this naive approach checks everything, should this be to slow, consider adding
// an implementation of https://en.wikipedia.org/wiki/Knuth%E2%80%93Morris%E2%80%93Pratt_algorithm
#[tauri::command]
pub async fn scan_file_for_bytes(
    app_handle: AppHandle,
    path: &str,
    search_bytes: &[u8],
    scan_amount: Option<usize>,
) -> Result<Option<usize>, String> {
    let validated_path = get_allowed_path_with_string_error(&app_handle, path)?;
    if search_bytes.len() < 1 {
        return Err(String::from("Received no bytes to search for."));
    }

    let mut loading_buffer_size = 8 * 1024; // like current default
    while loading_buffer_size < search_bytes.len() * 4 {
        loading_buffer_size *= 2;
    }
    let max_scan_bytes = scan_amount.unwrap_or(usize::MAX);

    let scan_result = || -> Result<Option<usize>, io::Error> {
        let mut f = File::open(validated_path)?;

        let offset_buffer_size = search_bytes.len() - 1;
        let real_buffer_size = loading_buffer_size + offset_buffer_size;
        let mut buffer: Vec<u8> = vec![0; real_buffer_size];

        let mut read_start_index = 0;
        let mut num_current_bytes;
        while {
            num_current_bytes = f.read(&mut buffer[offset_buffer_size..])?;
            0 < num_current_bytes
        } {
            let buf_start_index = if read_start_index == 0 {
                offset_buffer_size
            } else {
                0
            };

            let mut max_bytes_reached = false;
            let buf_to_search_in = if read_start_index + num_current_bytes > max_scan_bytes {
                max_bytes_reached = true;
                &buffer[buf_start_index..(max_scan_bytes + offset_buffer_size - read_start_index)]
            } else if num_current_bytes < loading_buffer_size {
                &buffer[buf_start_index..(num_current_bytes + offset_buffer_size)]
            } else {
                &buffer[buf_start_index..]
            };

            let sub_index_option = buf_to_search_in
                .windows(search_bytes.len())
                .position(|window| window == search_bytes);
            if let Some(sub_index) = sub_index_option {
                return Ok(Some(
                    sub_index + read_start_index + buf_start_index - offset_buffer_size,
                ));
            } else if max_bytes_reached {
                return Ok(None);
            }

            // copy for next iteration, ignored if done
            buffer.copy_within(
                num_current_bytes..(offset_buffer_size + num_current_bytes),
                0,
            );
            read_start_index += num_current_bytes;
        }
        Ok(None)
    }();
    scan_result.map_err(|err| err.to_string())
}
