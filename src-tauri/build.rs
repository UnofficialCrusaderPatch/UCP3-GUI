use tauri_build::{Attributes, DefaultPermissionRule, InlinedPlugin};

// Tauri v2 checks every plugin command against the ACL (capabilities/*.json).
// The app's own inline plugins therefore need generated permissions; each gets
// a "default" permission that allows all of its commands.
fn inlined(commands: &'static [&'static str]) -> InlinedPlugin {
    InlinedPlugin::new()
        .commands(commands)
        .default_permission(DefaultPermissionRule::AllowAllCommands)
}

fn main() {
    tauri_build::try_build(
        Attributes::new()
            .plugin("ucp-config", inlined(&["get_config_recent_folders","select_config_recent_folder","remove_config_recent_folder","get_config_log_level","set_config_log_level","save_config"]))
            .plugin("ucp-logging", inlined(&["log"]))
            .plugin("ucp-zip-support", inlined(&["extract_zip_to_path","load_zip_reader","close_zip_reader","is_zip_reader_empty","get_zip_reader_number_of_entries","exist_zip_reader_entry","get_zip_reader_entry_names","get_zip_reader_entry_as_binary","get_zip_reader_entry_as_text","load_zip_writer","close_zip_writer","add_zip_writer_directory","write_zip_writer_entry_from_binary","write_zip_writer_entry_from_text","write_zip_writer_entry_from_file"])),
    )
    .expect("failed to run tauri-build");
}
