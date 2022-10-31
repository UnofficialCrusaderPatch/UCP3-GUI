use std::{fs, path::Path};
use zip::{ZipArchive, result::ZipError};

// careless, overwrites, may leave remains on error
#[tauri::command]
pub fn extract_zip_to_path(source: &str, dest: &str) -> Result<(), String> {
    let extract_result = || -> Result<(), ZipError> {
        let file = fs::File::open(Path::new(source))?;
        let mut archive = ZipArchive::new(file)?;
        archive.extract(Path::new(dest))
    }();
    if let Some(error) = extract_result.err() {
        return Err(error.to_string());
    }
    Ok(())
}