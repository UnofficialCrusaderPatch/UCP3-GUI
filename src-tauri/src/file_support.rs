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

// Validate the discovered storage entry, not an extension name or store URL.
fn extension_path(
    game_folder: &Path,
    path: Option<&Path>,
    open_directory: bool,
    is_allowed: impl Fn(&Path) -> bool,
) -> Result<std::path::PathBuf, String> {
    use std::path::Component;
    if !game_folder.is_absolute() {
        return Err("No absolute game folder selected".into());
    }
    let root = game_folder.join("ucp");
    let target = path.unwrap_or(&root);
    if let Some(path) = path {
        let relative = path
            .strip_prefix(&root)
            .map_err(|_| "Stale extension path")?;
        let parts: Vec<_> = relative.components().collect();
        if parts.len() != 2
            || !matches!(parts[0], Component::Normal(name) if name == "modules" || name == "plugins")
            || !matches!(parts[1], Component::Normal(_))
        {
            return Err("Invalid extension storage path".into());
        }
    }
    if !is_allowed(target) {
        return Err("Path outside configured filesystem scope".into());
    }
    let canonical = dunce::canonicalize(target).map_err(|err| err.to_string())?;
    if !is_allowed(&canonical) {
        return Err("Resolved path outside configured filesystem scope".into());
    }
    if path.is_none() || open_directory {
        if !canonical.is_dir() {
            return Err("Expected an existing directory".into());
        }
    } else if !canonical.is_dir()
        && !(canonical.is_file() && target.extension().map_or(false, |ext| ext == "zip"))
    {
        return Err("Expected an installed extension directory or archive".into());
    }
    // Retain the installed location for symlinks: reveal the link, not its target.
    Ok(target.to_path_buf())
}

#[cfg(test)]
mod folder_tests {
    use super::*;
    use std::fs;
    use std::path::PathBuf;
    use std::sync::atomic::{AtomicUsize, Ordering};

    static NEXT: AtomicUsize = AtomicUsize::new(0);
    struct Fixture(PathBuf);
    impl Fixture {
        fn new() -> Self {
            let path = std::env::temp_dir().join(format!(
                "ucp-folder-Ä space-{}-{}",
                std::process::id(),
                NEXT.fetch_add(1, Ordering::Relaxed)
            ));
            fs::create_dir_all(path.join("ucp/plugins/test-1.0.0")).unwrap();
            fs::create_dir_all(path.join("ucp/modules/developer-1.0.0")).unwrap();
            fs::write(path.join("ucp/modules/test-1.0.0.zip"), b"fixture").unwrap();
            fs::write(path.join("ucp/modules/not-an-extension.exe"), b"fixture").unwrap();
            Self(path)
        }
    }
    impl Drop for Fixture {
        fn drop(&mut self) {
            fs::remove_dir_all(&self.0).unwrap();
        }
    }

    #[test]
    fn opens_real_root_and_installed_directory_or_archive() {
        let f = Fixture::new();
        assert_eq!(
            extension_path(&f.0, None, false, |_| true).unwrap(),
            f.0.join("ucp")
        );
        for name in [
            "plugins/test-1.0.0",
            "modules/developer-1.0.0",
            "modules/test-1.0.0.zip",
        ] {
            let path = f.0.join("ucp").join(name);
            assert_eq!(
                extension_path(&f.0, Some(&path), false, |_| true).unwrap(),
                path
            );
        }
    }

    #[test]
    fn rejects_unconfigured_missing_stale_and_malformed_paths() {
        let f = Fixture::new();
        let other = Fixture::new();
        for folder in [Path::new(""), Path::new("relative"), &f.0.join("absent")] {
            assert!(extension_path(folder, None, false, |_| true).is_err());
        }
        for path in [
            other.0.join("ucp/plugins/test-1.0.0"),
            f.0.join("ucp/modules/missing-1.0.0.zip"),
            f.0.join("ucp/modules/../plugins/test-1.0.0"),
            f.0.join("ucp/modules/not-an-extension.exe"),
            f.0.join("ucp/plugins/test-1.0.0/definition.yml"),
            PathBuf::from("https://example.com/module.zip"),
        ] {
            assert!(
                extension_path(&f.0, Some(&path), false, |_| true).is_err(),
                "{:?}",
                path
            );
        }
        assert!(!f.0.join("absent").exists());
    }

    #[test]
    fn rejects_scope_denials_and_opening_an_archive_as_a_directory() {
        let f = Fixture::new();
        assert!(extension_path(&f.0, None, false, |_| false).is_err());
        let archive = f.0.join("ucp/modules/test-1.0.0.zip");
        assert!(extension_path(&f.0, Some(&archive), true, |_| true).is_err());
    }

    #[cfg(unix)]
    #[test]
    fn checks_resolved_scope_but_retains_the_installed_symlink() {
        let f = Fixture::new();
        let other = Fixture::new();
        let link = f.0.join("ucp/plugins/link-1.0.0");
        std::os::unix::fs::symlink(other.0.join("ucp/plugins/test-1.0.0"), &link).unwrap();
        assert!(extension_path(&f.0, Some(&link), false, |path| path.starts_with(&f.0)).is_err());
        assert_eq!(
            extension_path(&f.0, Some(&link), false, |_| true).unwrap(),
            link
        );
    }
}

fn open_in_file_manager(path: &Path, reveal: bool) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        // Discovery uses forward slashes; Explorer requires native separators.
        let native_path: std::path::PathBuf = path.components().collect();
        // Structured argv: never pass a discovered path through cmd.exe.
        let mut command = std::process::Command::new("explorer.exe");
        if reveal {
            command.arg("/select,");
        }
        command
            .arg(native_path)
            .creation_flags(0x08000000)
            .spawn()
            .map_err(|err| err.to_string())?;
        Ok(())
    }
    #[cfg(target_os = "linux")]
    {
        let directory = if reveal {
            path.parent().ok_or("Missing containing directory")?
        } else {
            path
        };
        let mut command = std::process::Command::new("xdg-open");
        command.arg(directory);
        if std::env::var_os("APPDIR").is_some() {
            // AppImage libraries are for this app, not the system file manager.
            for key in [
                "LD_LIBRARY_PATH",
                "LD_PRELOAD",
                "GTK_PATH",
                "GTK_EXE_PREFIX",
                "GTK_DATA_PREFIX",
                "GDK_PIXBUF_MODULE_FILE",
                "GIO_EXTRA_MODULES",
                "GSETTINGS_SCHEMA_DIR",
            ] {
                command.env_remove(key);
            }
        }
        let mut child = command.spawn().map_err(|err| err.to_string())?;
        // Some desktops keep xdg-open alive for the lifetime of the folder window.
        // Observe startup failures without waiting for the user to close it.
        for _ in 0..20 {
            if let Some(status) = child.try_wait().map_err(|err| err.to_string())? {
                return if status.success() {
                    Ok(())
                } else {
                    Err(format!("File manager failed: {}", status))
                };
            }
            std::thread::sleep(std::time::Duration::from_millis(25));
        }
        std::thread::spawn(move || match child.wait() {
            Ok(status) if status.success() => (),
            result => log::warn!("File manager exited after startup: {:?}", result),
        });
        Ok(())
    }
    #[cfg(not(any(target_os = "windows", target_os = "linux")))]
    {
        let _ = (path, reveal);
        Err("File manager action unsupported on this platform".into())
    }
}

#[tauri::command]
pub async fn open_extension_path(
    app_handle: AppHandle,
    game_folder: String,
    path: Option<String>,
    open_directory: Option<bool>,
) -> Result<(), String> {
    // The frontend may still display the previous installation while initializing.
    let selected = crate::gui_config::get_config_recent_folders(app_handle.clone());
    if selected.first() != Some(&game_folder) {
        return Err("Selected installation changed".into());
    }
    let reveal = path.is_some() && !open_directory.unwrap_or(false);
    let target = extension_path(
        Path::new(&game_folder),
        path.as_deref().map(Path::new),
        open_directory.unwrap_or(false),
        |candidate| app_handle.fs_scope().is_allowed(candidate),
    )?;
    tauri::async_runtime::spawn_blocking(move || open_in_file_manager(&target, reveal))
        .await
        .map_err(|err| err.to_string())?
}

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
    search_bytes: Vec<u8>,
    scan_amount: Option<usize>,
) -> Result<Option<usize>, String> {
    let search_bytes = &search_bytes;
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
