import { GAME_FOLDER_ATOM } from 'function/global/global-atoms';
import { selectAtom } from 'jotai/utils';
import { resolvePath } from 'tauri/tauri-files';

async function getVanillaPath(gameFolder: string): Promise<string> {
  return resolvePath(gameFolder, 'Stronghold Crusader.exe');
}

async function getExtremePath(gameFolder: string): Promise<string> {
  return resolvePath(gameFolder, 'Stronghold_Crusader_Extreme.exe');
}

export const VANILLA_PATH_ATOM = selectAtom(GAME_FOLDER_ATOM, getVanillaPath);

export const EXTREME_PATH_ATOM = selectAtom(GAME_FOLDER_ATOM, getExtremePath);
