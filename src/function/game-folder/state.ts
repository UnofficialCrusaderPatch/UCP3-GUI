/* eslint-disable import/prefer-default-export */
import { P } from '@tauri-apps/api/event-41a9edf5';
import { INIT_RUNNING } from 'function/global/global-atoms';
import { atom, useAtomValue } from 'jotai';
import { loadable } from 'jotai/utils';
import Logger from 'util/scripts/logging';
import { exists } from '@tauri-apps/api/fs';
import { initializeGameFolder } from './initialization';

export const LOGGER = new Logger('game-folder/state.ts');

export const GAME_FOLDER_ATOM = atom('');

export const GAME_FOLDER_INTERFACE_ASYNC_ATOM = atom(
  (get) => get(GAME_FOLDER_ATOM),
  async (get, set, newValue: string) => {
    const oldValue = get(GAME_FOLDER_ATOM);

    if (newValue === oldValue || get(INIT_RUNNING)) {
      return;
    }

    await initializeGameFolder(newValue);

    set(GAME_FOLDER_ATOM, newValue);
  },
);

export const GAME_FOLDER_LOADED_ASYNC_ATOM = atom((get) =>
  get(GAME_FOLDER_INTERFACE_ASYNC_ATOM),
);
export const GAME_FOLDER_LOADED_ATOM = loadable(GAME_FOLDER_LOADED_ASYNC_ATOM);

export function useCurrentGameFolder() {
  return useAtomValue(GAME_FOLDER_ATOM); // only a proxy
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
