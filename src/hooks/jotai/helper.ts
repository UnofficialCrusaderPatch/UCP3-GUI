import { Extension } from 'config/ucp/common';
import { getExtensions } from 'config/ucp/extension-util';
import { useTranslation } from 'react-i18next';
import Logger, { ConsoleLogger } from 'util/scripts/logging';
import { exists } from '@tauri-apps/api/fs';
import importButtonCallback from 'components/ucp-tabs/common/ImportButtonCallback';
import { ExtensionTree } from 'function/extensions/dependency-management/dependency-resolution';
import { showGeneralModalOk } from 'components/modals/ModalOk';
import { atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
import {
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_WARNINGS_REDUCER_ATOM,
  EXTENSION_STATE_REDUCER_ATOM,
  GAME_FOLDER_ATOM,
  INIT_DONE,
  INIT_RUNNING,
  UCP_CONFIG_FILE_ATOM,
} from 'function/global/global-atoms';
import { LANGUAGE_ATOM } from 'function/global/gui-settings/guiSettings';
import i18next from 'i18next';
import { initializeGameFolder } from 'function/game-folder/state';
import { getStore } from './base';

const LOGGER = new Logger('helper.ts');

export function useCurrentGameFolder() {
  return useAtomValue(GAME_FOLDER_ATOM); // only a proxy
}

export async function setAndInitializeGameFolder(newFolder: string) {
  // kinda bad, it might skip a folder switch
  if (getStore().get(INIT_RUNNING)) {
    return;
  }
  getStore().set(GAME_FOLDER_ATOM, newFolder);
  await initializeGameFolder(newFolder);
}

export function useGameFolder(): [
  string,
  (newFolder: string) => Promise<void>,
] {
  return [getStore().get(GAME_FOLDER_ATOM), setAndInitializeGameFolder];
}

export type InitializationState = {
  status: 'NOT_STARTED' | 'RUNNING' | 'DONE';
  messages: [];
};

export const INITIALIZATION_STATE_ATOM = atom<Promise<InitializationState>>(
  async (get) => {
    const folder = get(GAME_FOLDER_ATOM);

    await initializeGameFolder(folder);

    return {
      status: 'NOT_STARTED',
      messages: [],
    };
  },
);
