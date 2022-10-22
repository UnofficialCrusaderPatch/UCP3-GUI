use tauri::Manager;

// This function is not async, and will run in the Rust main thread.
// It should therefore kinda behave like JS in a way.
// Truly async stuff (other thread) is possible by using "async"
// Currently it is not possible to delete them, and it will add the complete folder.
#[tauri::command]
pub fn add_dir_to_fs_scope(app_handle: tauri::AppHandle, path: &str) -> Result<(), tauri::Error> {
    app_handle.fs_scope().allow_directory(path, true)
}
