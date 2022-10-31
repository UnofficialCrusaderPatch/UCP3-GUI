// Helper file, wrapping tauri invokes in simple functions

import { invoke } from '@tauri-apps/api/tauri';

const TAURI_COMMAND = {
  CONFIG_SET_LANGUAGE: 'set_config_language',
  CONFIG_GET_LANGUAGE: 'get_config_language',
  CONFIG_GET_RECENT_FOLDERS: 'get_config_recent_folders',
  CONFIG_GET_MOST_RECENT_FOLDER: 'get_config_most_recent_folder',
  CONFIG_ADD_RECENT_FOLDER: 'add_config_recent_folder',
  CONFIG_REMOVE_RECENT_FOLDER: 'remove_config_recent_folder',
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
