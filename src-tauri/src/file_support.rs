use path_slash::{PathBufExt, PathExt};
use std::path::Path;
use tauri::{
    api::dir::{read_dir, DiskEntry},
    scope::GlobPattern,
    AppHandle, FsScope, Manager,
};

use crate::{constants::PATH_MATCH_OPTIONS, utils::{get_allowed_path_with_string_error, get_allowed_path}};

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
        Ok(path) => if path.exists() {
            path
        } else {
            return Ok(vec![])
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
