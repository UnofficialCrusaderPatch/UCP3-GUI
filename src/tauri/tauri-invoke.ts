// Helper file, wrapping tauri invokes in simple functions

import { invoke } from '@tauri-apps/api/tauri';

const PLUGIN_CONFIG = 'tauri-plugin-ucp-config';
const PLUGIN_LOGGING = 'tauri-plugin-ucp-logging';
const PLUGIN_ZIP = 'tauri-plugin-ucp-zip-support';

function buildPluginCmd(pluginName: string, command: string) {
  return `plugin:${pluginName}|${command}`;
}

/* eslint-disable */
const TAURI_COMMAND = {
  CONFIG_SET_LANGUAGE: buildPluginCmd(PLUGIN_CONFIG, 'set_config_language'),
  CONFIG_GET_LANGUAGE: buildPluginCmd(PLUGIN_CONFIG, 'get_config_language'),
  CONFIG_GET_RECENT_FOLDERS: buildPluginCmd(PLUGIN_CONFIG, 'get_config_recent_folders',),
  CONFIG_GET_MOST_RECENT_FOLDER: buildPluginCmd(PLUGIN_CONFIG, 'get_config_most_recent_folder',),
  CONFIG_ADD_RECENT_FOLDER: buildPluginCmd(PLUGIN_CONFIG, 'add_config_recent_folder',),
  CONFIG_REMOVE_RECENT_FOLDER: buildPluginCmd(PLUGIN_CONFIG, 'remove_config_recent_folder',),

  ZIP_EXTRACT_TO_PATH: buildPluginCmd(PLUGIN_ZIP, 'extract_zip_to_path'),
  ZIP_READER_LOAD: buildPluginCmd(PLUGIN_ZIP, 'load_zip_reader'),
  ZIP_READER_CLOSE: buildPluginCmd(PLUGIN_ZIP, 'close_zip_reader'),
  ZIP_READER_EXIST_ENTRY: buildPluginCmd(PLUGIN_ZIP, 'exist_zip_reader_entry'),
  ZIP_READER_GET_ENTRY_AS_BINARY: buildPluginCmd(PLUGIN_ZIP, 'get_zip_reader_entry_as_binary',),
  ZIP_READER_GET_ENTRY_AS_TEXT: buildPluginCmd(PLUGIN_ZIP, 'get_zip_reader_entry_as_text',),
  ZIP_WRITER_LOAD: buildPluginCmd(PLUGIN_ZIP, 'load_zip_writer'),
  ZIP_WRITER_CLOSE: buildPluginCmd(PLUGIN_ZIP, 'close_zip_writer'),
  ZIP_WRITER_ADD_DIRECTORY: buildPluginCmd(PLUGIN_ZIP, 'add_zip_writer_directory',),
  ZIP_WRITER_WRITE_ENTRY_FROM_BINARY: buildPluginCmd(PLUGIN_ZIP, 'write_zip_writer_entry_from_binary',),
  ZIP_WRITER_WRITE_ENTRY_FROM_TEXT: buildPluginCmd(PLUGIN_ZIP, 'write_zip_writer_entry_from_text',),
  ZIP_WRITER_WRITE_ENTRY_FROM_FILE: buildPluginCmd(PLUGIN_ZIP, 'write_zip_writer_entry_from_file',),

  HASH_GET_SHA256_OF_FILE: 'get_sha256_of_file',
  OS_OPEN_PROGRAM: "os_open_program",

  LOGGING_LOG: buildPluginCmd(PLUGIN_LOGGING, 'log'),
};
/* eslint-enable */

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
  dest: string,
): Promise<void> {
  return invoke(TAURI_COMMAND.ZIP_EXTRACT_TO_PATH, { source, dest });
}

// WARNING: Do not use directly, only through ZipReader
export async function loadZipReader(source: string): Promise<number> {
  return invoke(TAURI_COMMAND.ZIP_READER_LOAD, { source });
}

// WARNING: Do not use directly, only through ZipReader
export async function closeZipReader(id: number): Promise<void> {
  return invoke(TAURI_COMMAND.ZIP_READER_CLOSE, { id });
}

// WARNING: Do not use directly, only through ZipReader
export async function existZipReaderEntry(
  id: number,
  path: string,
): Promise<boolean> {
  return invoke(TAURI_COMMAND.ZIP_READER_EXIST_ENTRY, { id, path });
}

// WARNING: Do not use directly, only through ZipReader
export async function getZipReaderEntryAsBinary(
  id: number,
  path: string,
): Promise<Uint8Array> {
  return invoke(TAURI_COMMAND.ZIP_READER_GET_ENTRY_AS_BINARY, { id, path });
}

// WARNING: Do not use directly, only through ZipReader
export async function getZipReaderEntryAsText(
  id: number,
  path: string,
): Promise<string> {
  return invoke(TAURI_COMMAND.ZIP_READER_GET_ENTRY_AS_TEXT, { id, path });
}

// WARNING: Do not use directly, only through ZipWriter
export async function loadZipWriter(source: string): Promise<number> {
  return invoke(TAURI_COMMAND.ZIP_WRITER_LOAD, { source });
}

// WARNING: Do not use directly, only through ZipWriter
export async function closeZipWriter(id: number): Promise<void> {
  return invoke(TAURI_COMMAND.ZIP_WRITER_CLOSE, { id });
}

// WARNING: Do not use directly, only through ZipWriter
export async function addZipWriterDirectory(
  id: number,
  path: string,
): Promise<boolean> {
  return invoke(TAURI_COMMAND.ZIP_WRITER_ADD_DIRECTORY, { id, path });
}

// WARNING: Do not use directly, only through ZipWriter
export async function writeZipWriterEntryFromBinary(
  id: number,
  path: string,
  binary: ArrayBuffer,
): Promise<void> {
  return invoke(TAURI_COMMAND.ZIP_WRITER_WRITE_ENTRY_FROM_BINARY, {
    id,
    path,
    binary,
  });
}

// WARNING: Do not use directly, only through ZipWriter
export async function writeZipWriterEntryFromText(
  id: number,
  path: string,
  text: string,
): Promise<void> {
  return invoke(TAURI_COMMAND.ZIP_WRITER_WRITE_ENTRY_FROM_TEXT, {
    id,
    path,
    text,
  });
}

// WARNING: Do not use directly, only through ZipWriter
export async function writeZipWriterEntryFromFile(
  id: number,
  path: string,
  source: string,
): Promise<void> {
  return invoke(TAURI_COMMAND.ZIP_WRITER_WRITE_ENTRY_FROM_FILE, {
    id,
    path,
    source,
  });
}

export async function getSha256OfFile(path: string): Promise<string> {
  return invoke(TAURI_COMMAND.HASH_GET_SHA256_OF_FILE, { path });
}

export async function log(level: number, message: string): Promise<void> {
  return invoke(TAURI_COMMAND.LOGGING_LOG, { level, message });
}

export async function runProgram(
  path: string,
  args: string[] = [],
  envs: Record<string, string> = {},
): Promise<void> {
  return invoke(TAURI_COMMAND.OS_OPEN_PROGRAM, { path, args, envs });
}
