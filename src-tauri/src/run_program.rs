use std::{collections::HashMap, path::Path, process::Command};
use tauri::AppHandle;

use crate::utils::get_allowed_path_with_string_error;

// source for no window handling: https://stackoverflow.com/a/75292572
#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(target_os = "windows")]
const CREATE_NO_WINDOW: u32 = 0x08000000;

#[cfg(target_os = "windows")]
fn create_os_open_command<P: AsRef<Path>>(directory: P, filename: P) -> Result<Command, String> {
    let mut command = Command::new("cmd");
    command
        .args(["/c", "start", "", "/b"])
        .arg(filename.as_ref())
        .current_dir(directory)
        .creation_flags(CREATE_NO_WINDOW);
    Ok(command)
}

// There needs to be tests to determine if the commands work like the windows one

// TODO: needs tests (args, env)
#[cfg(target_os = "macos")]
fn create_os_open_command<P: AsRef<Path>>(directory: P, filename: P) -> Result<Command, String> {
    // -c uses the first arg after the command as name (argument 0), so we use empty there
    let mut command = Command::new("sh");
    command
        .args(["-c", "open", ""])
        .arg(filename.as_ref())
        .current_dir(directory);
    Ok(command)
}

// TODO: needs tests (args, env)
#[cfg(target_os = "linux")]
fn create_os_open_command<P: AsRef<Path>>(directory: P, filename: P) -> Result<Command, String> {
    // -c uses the first arg after the command as name (argument 0), so we use empty there
    let mut command = Command::new("sh");
    command
        .args(["-c", "xdg-open", ""])
        .arg(filename.as_ref())
        .current_dir(directory);
    Ok(command)
}

// async (other thread), since it does not care about other stuff
// TODO: discuss if too general, and therefore unsafe? It uses at least the
// folder protection to avoid starting any file on the system (but all in the allowed directories)
#[tauri::command]
pub async fn os_open_program(
    app_handle: AppHandle,
    path: &str,
    args: Vec<String>,
    envs: HashMap<String, String>,
) -> Result<(), String> {
    let source_path = get_allowed_path_with_string_error(&app_handle, path)?;

    // Rust returns \\?\ - Paths for windows, which are more feature rich, but break for legacy stuff
    // The whole discussion can be found here: https://github.com/rust-lang/rust/issues/42869
    // This is the only reason we use the dunce crate
    // This might also break, but at least it will throw a not found error
    let path = dunce::canonicalize(source_path).map_err(|err| err.to_string())?;

    path.try_exists()
        .map_err(|_err| String::from("program.open.not.exist"))?;
    if path.is_dir() {
        return Err(String::from("program.open.is.dir"));
    }
    let directory = path
        .parent()
        .ok_or(String::from("program.open.no.directory.found"))?;
    let filename = path
        .file_name()
        .ok_or(String::from("program.open.no.filename.found"))?;

    let status = create_os_open_command(directory, filename.as_ref())?
        .args(args)
        .envs(envs)
        .status() // does not listen to stdin/stdout/stderr, so the streams are closed and the process detaches
        .map_err(|err| err.to_string())?;

    if !status.success() {
        return Err(String::from("program.open.failed"));
    }
    Ok(())
}
