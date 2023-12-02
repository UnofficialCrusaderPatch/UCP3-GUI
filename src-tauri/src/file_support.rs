use path_slash::{PathBufExt, PathExt};
use std::{borrow::Cow, ops::Deref, path::Path};
use tauri::{
    api::dir::{read_dir, DiskEntry},
    scope::GlobPattern,
    AppHandle,
};

use crate::utils::get_allowed_path_with_string_error;

fn fill_with_paths_with_slash(disk_entries: &Vec<DiskEntry>, fill_container: &mut Vec<String>) {
    for entry in disk_entries {
        if let Some(path_string) = entry.path.to_slash() {
            fill_container.push(path_string.to_string());
        }
        if let Some(children) = &entry.children {
            fill_with_paths_with_slash(children, fill_container);
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
    let source_path = get_allowed_path_with_string_error(&app_handle, base)?;
    let path = dunce::canonicalize(source_path).map_err(|err| err.to_string())?;

    let found_entries = read_dir(&path, true).map_err(|err| err.to_string())?;
    let mut found_paths = vec![];
    fill_with_paths_with_slash(&found_entries, &mut found_paths);

    if !pattern.is_empty() {
        let complete_pattern_path = path.join(pattern);
        let complete_pattern_path_with_slash = complete_pattern_path
            .to_slash()
            .unwrap_or_else(|| Cow::Borrowed(pattern));
        let glob_pattern = GlobPattern::new(complete_pattern_path_with_slash.deref())
            .map_err(|err| err.to_string())?;
        found_paths.retain(|path_string: &String| glob_pattern.matches(path_string));
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
pub async fn canonicalize(path: &str, slash: bool) -> Result<String, String> {
    let canonical_path = dunce::canonicalize(path).map_err(|err| err.to_string())?;
    if slash {
        slashify_path(&canonical_path)
    } else {
        canonical_path.to_str().map_or_else(
            || Err(String::from("Unable to canonicalize path.")),
            |canonical_path_str| Ok(canonical_path_str.to_string()),
        )
    }
}
