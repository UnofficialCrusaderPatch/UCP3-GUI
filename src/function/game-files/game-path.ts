import { atom } from 'jotai';
import { resolvePath } from '../../tauri/tauri-files';
import { GAME_FOLDER_INTERFACE_ASYNC_ATOM } from '../game-folder/game-folder-interface';

async function getVanillaPath(gameFolder: string): Promise<string> {
  if (!gameFolder) {
    return '';
  }

  return resolvePath(gameFolder, 'Stronghold Crusader.exe');
}

async function getExtremePath(gameFolder: string): Promise<string> {
  if (!gameFolder) {
    return '';
  }

  return resolvePath(gameFolder, 'Stronghold_Crusader_Extreme.exe');
}

export const VANILLA_PATH_ATOM = atom((get) =>
  getVanillaPath(get(GAME_FOLDER_INTERFACE_ASYNC_ATOM)),
);

export const EXTREME_PATH_ATOM = atom((get) =>
  getExtremePath(get(GAME_FOLDER_INTERFACE_ASYNC_ATOM)),
);
