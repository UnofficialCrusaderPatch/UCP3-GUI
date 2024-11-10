/* eslint-disable no-new-wrappers */
/* eslint-disable @typescript-eslint/ban-types */
import { atom } from 'jotai';
import { Atom } from 'jotai/vanilla';
import { resolvePath } from '../../tauri/tauri-files';
import { ASYNC_GAME_FOLDER_ATOM } from '../game-folder/interface';
import { GameDataWrapper } from './game-data';

async function getVanillaPath(gameFolder: string) {
  if (!gameFolder) {
    return '';
  }

  return resolvePath(gameFolder, 'Stronghold Crusader.exe');
}

async function getExtremePath(gameFolder: string) {
  if (!gameFolder) {
    return '';
  }

  return resolvePath(gameFolder, 'Stronghold_Crusader_Extreme.exe');
}

const EXE_PATHS_ATOM: Atom<Promise<GameDataWrapper<string>>> = atom(
  async (get) => {
    const gameFolder = await get(ASYNC_GAME_FOLDER_ATOM);
    return {
      vanilla: await getVanillaPath(gameFolder),
      extreme: await getExtremePath(gameFolder),
    };
  },
);

export default EXE_PATHS_ATOM;
