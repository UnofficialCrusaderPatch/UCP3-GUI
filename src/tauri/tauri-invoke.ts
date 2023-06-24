// Helper file, wrapping tauri invokes in simple functions

import { invoke } from '@tauri-apps/api/tauri';

const PLUGIN_LOGGING = 'tauri-plugin-ucp-logging';
const PLUGIN_ZIP = 'tauri-plugin-ucp-zip-support';

function buildPluginCmd(pluginName: string, command: string) {
  return `plugin:${pluginName}|${command}`;
}

const TAURI_COMMAND = {
  CONFIG_SET_LANGUAGE: 'set_config_language',
  CONFIG_GET_LANGUAGE: 'get_config_language',
  CONFIG_GET_RECENT_FOLDERS: 'get_config_recent_folders',
  CONFIG_GET_MOST_RECENT_FOLDER: 'get_config_most_recent_folder',
  CONFIG_ADD_RECENT_FOLDER: 'add_config_recent_folder',
  CONFIG_REMOVE_RECENT_FOLDER: 'remove_config_recent_folder',
  ZIP_EXTRACT_TO_PATH: buildPluginCmd(PLUGIN_ZIP, 'extract_zip_to_path'),
  ZIP_LOAD: buildPluginCmd(PLUGIN_ZIP, 'load_zip'),
  ZIP_CLOSE: buildPluginCmd(PLUGIN_ZIP, 'close_zip'),
  ZIP_EXIST_ENTRY: buildPluginCmd(PLUGIN_ZIP, 'exist_zip_entry'),
  ZIP_GET_ENTRY_AS_BINARY: buildPluginCmd(
    PLUGIN_ZIP,
    'get_zip_entry_as_binary'
  ),
  ZIP_GET_ENTRY_AS_TEXT: buildPluginCmd(PLUGIN_ZIP, 'get_zip_entry_as_text'),
  HASH_GET_SHA256_OF_FILE: 'get_sha256_of_file',
  LOGGING_LOG: buildPluginCmd(PLUGIN_LOGGING, 'log'),
};

export async function setGuiConfigLanguage(lang: string): Promise<void> {
  return invoke(TAURI_COMMAND.CONFIG_SET_LANGUAGE, { lang });
}

export async function getGuiConfigLanguage(): Promise<string | null> {
  return invoke(TAURI_COMMAND.CONFIG_GET_LANGUAGE);
}

export async function getGuiConfigRecentFolders(): Promise<string[]> {
  return invoke(TAURI_COMMAND.CONFIG_GET_RECENT_FOLDERS);
}

export async function getGuiConfigMostRecentFolder(): Promise<string | null> {
  return invoke(TAURI_COMMAND.CONFIG_GET_MOST_RECENT_FOLDER);
}

export async function addGuiConfigRecentFolder(path: string): Promise<void> {
  return invoke(TAURI_COMMAND.CONFIG_ADD_RECENT_FOLDER, { path });
}

export async function removeGuiConfigRecentFolder(path: string): Promise<void> {
  return invoke(TAURI_COMMAND.CONFIG_REMOVE_RECENT_FOLDER, { path });
}

export async function extractZipToPath(
  source: string,
  dest: string
): Promise<void> {
  return invoke(TAURI_COMMAND.ZIP_EXTRACT_TO_PATH, { source, dest });
}

export async function loadZip(source: string): Promise<number> {
  return invoke(TAURI_COMMAND.ZIP_LOAD, { source });
}

export async function closeZip(id: number): Promise<void> {
  return invoke(TAURI_COMMAND.ZIP_CLOSE, { id });
}

export async function existZipEntry(
  id: number,
  path: string
): Promise<boolean> {
  return invoke(TAURI_COMMAND.ZIP_EXIST_ENTRY, { id, path });
}

export async function getZipEntryAsBinary(
  id: number,
  path: string
): Promise<Uint8Array> {
  return invoke(TAURI_COMMAND.ZIP_GET_ENTRY_AS_BINARY, { id, path });
}

export async function getZipEntryAsText(
  id: number,
  path: string
): Promise<string> {
  return invoke(TAURI_COMMAND.ZIP_GET_ENTRY_AS_TEXT, { id, path });
}

export async function getSha256OfFile(path: string): Promise<string> {
  return invoke(TAURI_COMMAND.HASH_GET_SHA256_OF_FILE, { path });
}

export async function log(level: number, message: string): Promise<void> {
  return invoke(TAURI_COMMAND.LOGGING_LOG, { level, message });
}
