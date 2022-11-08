use std::fs;
use std::io;

use sha2::Digest;
use sha2::Sha256;
use tauri::AppHandle;

use crate::utils::get_allowed_path_with_string_error;

// async (other thread), since it does not care about other stuff
#[tauri::command]
pub async fn get_sha256_of_file(app_handle: AppHandle, path: &str) -> Result<String, String> {
    let source_path = get_allowed_path_with_string_error(&app_handle, path)?;

    let hash_result = || -> Result<String, io::Error> {
        // source: https://github.com/RustCrypto/hashes
        let mut file = fs::File::open(&source_path)?;
        let mut hasher = Sha256::new();
        io::copy(&mut file, &mut hasher)?;
        let hash_bytes = hasher.finalize();
        Ok(format!("{:x}", hash_bytes))
    }();
    hash_result.map_err(|error| error.to_string())
}
