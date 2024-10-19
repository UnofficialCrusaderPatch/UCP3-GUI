import { TauriEvent } from '@tauri-apps/api/event';
import { atom } from 'jotai';
import { atomWithRefresh, getStore } from '../../hooks/jotai/base';
import {
  getGuiConfigLogLevel,
  getGuiConfigRecentFolders,
  removeGuiConfigRecentFolder,
  saveGuiConfig,
  selectGuiConfigRecentFolder,
  setGuiConfigLogLevel,
} from '../../tauri/tauri-invoke';
import { onGuiFileConfigChange } from '../../tauri/tauri-listen';
import { registerTauriEventListener } from '../../tauri/tauri-hooks';

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

const INTERNAL_MOST_RECENT_FOLDER_ATOM = atomWithRefresh(async () => {
  const folders = await getStore().get(INTERNAL_RECENT_FOLDERS_ATOM); // breaks relation
  return folders.length > 0 ? folders[0] : undefined;
});

const INTERNAL_BACKEND_LOG_LEVEL_ATOM = atomWithRefresh(getGuiConfigLogLevel);

const configUnlistenPromise = onGuiFileConfigChange(async ({ payload }) => {
  switch (payload.event_type) {
    case GUI_CONFIG_FILE_EVENT.RECENT_FOLDER: {
      getStore().set(INTERNAL_RECENT_FOLDERS_ATOM);
      const folders = await getStore().get(INTERNAL_RECENT_FOLDERS_ATOM);
      const newMostRecent = folders.length > 0 ? folders[0] : undefined;
      const currentMostRecent = await getStore().get(
        INTERNAL_MOST_RECENT_FOLDER_ATOM,
      );
      if (newMostRecent !== currentMostRecent) {
        getStore().set(INTERNAL_MOST_RECENT_FOLDER_ATOM);
      }
      break;
    }
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

export const MOST_RECENT_FOLDER_ATOM = atom((get) =>
  get(INTERNAL_MOST_RECENT_FOLDER_ATOM),
);

// only returns selected folder if new, otherwise check return of most recent folder
export function selectNewRecentGameFolder(
  title?: string,
  baseDirectory?: string,
) {
  return selectGuiConfigRecentFolder(baseDirectory, true, title);
}

export function selectRecentGameFolder(path: string) {
  return selectGuiConfigRecentFolder(path);
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

// should only be used if there is really no other way
export function saveGuiFileConfig() {
  return saveGuiConfig();
}

// save on window close
// TODO?: this will trigger multiple saves should we ever have multiple windows
// However, this may or may not be a problem in future
registerTauriEventListener(TauriEvent.WINDOW_CLOSE_REQUESTED, saveGuiConfig);
