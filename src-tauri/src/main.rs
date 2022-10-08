#![cfg_attr(
  all(not(debug_assertions), target_os = "windows"),
  windows_subsystem = "windows"
)]

fn main() {
  // this now uses tauri_plugin_persisted_scope plugin to save the scope selected by
  // the open file dialog, giving JS full access is considered bad form
  // however, currently, the folders itself and the access are saved in different files
  // once we have the know how, we should move the file stuff in rust, so that we do not need
  // to care about the allowlist system anymore
  tauri::Builder::default()
    .plugin(tauri_plugin_persisted_scope::init())
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
