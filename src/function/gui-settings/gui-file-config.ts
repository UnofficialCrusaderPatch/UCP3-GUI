/* eslint-disable no-new-wrappers */
import { TauriEvent } from '@tauri-apps/api/event';
import { atom } from 'jotai';
import { unwrap } from 'jotai/utils';
import { atomWithRefresh, getStore } from '../../hooks/jotai/base';
import {
  getGuiConfigLogLevel,
  getGuiConfigRecentFolders,
  registerGuiConfigRecentFolderUsage,
  removeGuiConfigRecentFolder,
  saveGuiConfig,
  selectGuiConfigNewRecentFolder,
  setGuiConfigLogLevel,
} from '../../tauri/tauri-invoke';
import { onGuiFileConfigChange } from '../../tauri/tauri-listen';
import { registerTauriEventListener } from '../../tauri/tauri-hooks';

export const MOST_RECENT_FOLDER_EMPTY = new String('');

const GUI_CONFIG_FILE_EVENT = {
  RECENT_FOLDER: 'RECENT_FOLDER',
  LOG: 'LOG',
};

export const BACKEND_LOG_LEVEL = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
  TRACE: 'TRACE',
};

const INTERNAL_RECENT_FOLDERS_ATOM = atomWithRefresh(getGuiConfigRecentFolders);
const INTERNAL_MOST_RECENT_FOLDER_ATOM = atom(async (get) => {
  const folders = await get(INTERNAL_RECENT_FOLDERS_ATOM);
  return folders.length > 0 ? new String(folders[0]) : MOST_RECENT_FOLDER_EMPTY;
});

const INTERNAL_BACKEND_LOG_LEVEL_ATOM = atomWithRefresh(getGuiConfigLogLevel);

const configUnlistenPromise = onGuiFileConfigChange(({ payload }) => {
  switch (payload.eventType) {
    case GUI_CONFIG_FILE_EVENT.RECENT_FOLDER:
      getStore().set(INTERNAL_RECENT_FOLDERS_ATOM);
      break;
    case GUI_CONFIG_FILE_EVENT.LOG:
      getStore().set(INTERNAL_BACKEND_LOG_LEVEL_ATOM);
      break;
    default:
      break;
  }
});
registerTauriEventListener(TauriEvent.WINDOW_CLOSE_REQUESTED, async () =>
  (await configUnlistenPromise)(),
);

export const RECENT_FOLDERS_ATOM = atom((get) =>
  get(INTERNAL_RECENT_FOLDERS_ATOM),
);

/**
 * Return String wrapper objects to always generate updates.
 * Be aware of this in case of comparisons!
 *
 * Until a value is loaded or if no folder is available, the value will be MOST_RECENT_FOLDER_EMPTY.
 */
export const MOST_RECENT_FOLDER_ATOM = unwrap(
  INTERNAL_MOST_RECENT_FOLDER_ATOM,
  (prev) => prev ?? MOST_RECENT_FOLDER_EMPTY, // will stay the same until new update done
);

export function selectNewRecentGameFolder(
  title: string = '',
  baseDirectory: string = '',
) {
  return selectGuiConfigNewRecentFolder(title, baseDirectory);
}

export function selectRecentGameFolder(path: string) {
  return registerGuiConfigRecentFolderUsage(path);
}

export function removeFromRecentFolders(path: string) {
  return removeGuiConfigRecentFolder(path);
}

// contains threshold level used for backend logs (includes those send to the frontend)
// also defines which logs are written to the log files on the system
// TODO?: There is currently a mixture here, since logs send to the frontend are also controlled
// through this. This might be ok, but should the logging system be touched ever again, it might
// be an idea to restructure this
export const BACKEND_LOG_LEVEL_ATOM = atom((get) =>
  get(INTERNAL_BACKEND_LOG_LEVEL_ATOM),
);

export function setBackendLogLevel(level: keyof typeof BACKEND_LOG_LEVEL) {
  return setGuiConfigLogLevel(level);
}

// save on window close
// TODO?: this will trigger multiple saves should we ever have multiple windows
// However, this may or may not be a problem in future
registerTauriEventListener(TauriEvent.WINDOW_CLOSE_REQUESTED, saveGuiConfig);
