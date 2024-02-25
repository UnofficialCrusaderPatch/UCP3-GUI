import { atom, useAtomValue } from 'jotai';
import { loadable } from 'jotai/utils';
import { exists } from '@tauri-apps/api/fs';
import Logger from '../../util/scripts/logging';
import { GAME_FOLDER_INTERFACE_ASYNC_ATOM } from './game-folder-interface';
import { GAME_FOLDER_ATOM } from './game-folder-atom';

export const LOGGER = new Logger('game-folder/utils.ts');

export const GAME_FOLDER_LOADED_ASYNC_ATOM = atom((get) =>
  get(GAME_FOLDER_INTERFACE_ASYNC_ATOM),
);
export const GAME_FOLDER_LOADED_ATOM = loadable(GAME_FOLDER_LOADED_ASYNC_ATOM);

export function useCurrentGameFolder() {
  return useAtomValue(GAME_FOLDER_INTERFACE_ASYNC_ATOM); // only a proxy
}

const DOES_UCP_FOLDER_EXIST_ASYNC_ATOM = atom(async (get) => {
  const folder = get(GAME_FOLDER_ATOM);
  if (
    folder === undefined ||
    folder === null ||
    folder.length === 0 ||
    folder === ''
  )
    return false;

  const result = await exists(`${folder}/ucp`);
  return result;
});

export const DOES_UCP_FOLDER_EXIST_ATOM = loadable(
  DOES_UCP_FOLDER_EXIST_ASYNC_ATOM,
);
