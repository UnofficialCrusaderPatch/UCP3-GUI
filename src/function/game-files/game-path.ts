/* eslint-disable no-new-wrappers */
/* eslint-disable @typescript-eslint/ban-types */
import { atom } from 'jotai';
import { resolvePath } from '../../tauri/tauri-files';
import { GAME_FOLDER_ATOM } from '../game-folder/game-folder-interface';

export const EMPTY_GAME_PATH = new String('');

async function getVanillaPath(gameFolder: string): Promise<String> {
  if (!gameFolder) {
    return EMPTY_GAME_PATH;
  }

  return resolvePath(gameFolder, 'Stronghold Crusader.exe').then(
    (path) => new String(path),
  );
}

async function getExtremePath(gameFolder: string): Promise<String> {
  if (!gameFolder) {
    return EMPTY_GAME_PATH;
  }

  return resolvePath(gameFolder, 'Stronghold_Crusader_Extreme.exe').then(
    (path) => new String(path),
  );
}

export const VANILLA_PATH_ATOM = atom((get) =>
  getVanillaPath(get(GAME_FOLDER_ATOM).valueOf()),
);

export const EXTREME_PATH_ATOM = atom((get) =>
  getExtremePath(get(GAME_FOLDER_ATOM).valueOf()),
);
