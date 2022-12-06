import { useTranslation } from 'react-i18next';
import { KeyedMutator } from 'swr';
import useSWRImmutable from 'swr/immutable'; // only fetches once
import { Event, UnlistenFn } from '@tauri-apps/api/event';
import { onLanguageChange } from 'tauri/tauri-listen';
import { getGuiConfigLanguage, setGuiConfigLanguage } from 'tauri/tauri-invoke';
import { RecentFolderHelper } from 'config/gui/recent-folder-helper';
import {
  registerForWindowClose,
  unregisterForWindowClose,
} from 'tauri/tauri-hooks';
import {
  getUCPState,
  UCPState,
  activateUCP,
  deactivateUCP,
} from 'function/ucp/ucp-state';
import Result from 'util/structs/result';
import {
  getEmptyUCPVersion,
  loadUCPVersion,
  UCPVersion,
} from 'function/ucp/ucp-version';
import { useCurrentGameFolder } from './hooks';

export interface SwrResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  mutate: KeyedMutator<T>;
}

export interface Language {
  getLanguage: () => string | null;
  setLanguage: (lang: string) => Promise<void>;
  // needed if mutation is intended
  unlistenChangeEvent: UnlistenFn;
}

export interface UCPStateHandler {
  state: UCPState;
  activate: () => Promise<Result<void, unknown>>;
  deactivate: () => Promise<Result<void, unknown>>;
}

// keys are used to identify and cache the request, so they need to be unique for different sources
const SWR_KEYS = {
  RECENT_FOLDERS: 'ucp.gui.recent.folders',
  LANGUAGE_LOAD: 'ucp.lang.load',
  UCP_STATE: 'ucp.state.handler',
  UCP_VERSION: 'ucp.version.handler',
};

const LANG_WINDOW_CLOSE_KEY = 'LANG';

// eslint-disable-next-line import/prefer-default-export
export function useRecentFolders(): SwrResult<RecentFolderHelper> {
  // normal swr, since refetching is ok
  const { data, error, mutate } = useSWRImmutable(
    SWR_KEYS.RECENT_FOLDERS,
    async () => {
      const recentFolderHelper = new RecentFolderHelper();
      // the folders will only be loaded once, so multiple landing pages will not work
      // since the object here needs to copy the backend behavior and will not query again
      await recentFolderHelper.loadRecentFolders();
      return recentFolderHelper;
    }
  );
  return {
    data,
    isLoading: !data,
    isError: !!error,
    mutate,
  };
}

export function useLanguage(): SwrResult<Language> {
  const { i18n } = useTranslation();

  const { data, error, mutate } = useSWRImmutable(
    SWR_KEYS.LANGUAGE_LOAD,
    async () => {
      let lang = await getGuiConfigLanguage();
      i18n.changeLanguage(lang || undefined);
      const unlistenFunc = await onLanguageChange(
        (langEvent: Event<string>) => {
          lang = langEvent.payload;
          i18n.changeLanguage(lang || undefined);
        }
      );
      unregisterForWindowClose(LANG_WINDOW_CLOSE_KEY);
      registerForWindowClose(LANG_WINDOW_CLOSE_KEY, async () => unlistenFunc());
      return {
        getLanguage: () => lang,
        setLanguage: setGuiConfigLanguage,
        unlistenChangeEvent: unlistenFunc, // before a receiving mutate, unlisten needs to be called
      };
    }
  );
  return {
    data,
    isLoading: !data,
    isError: !!error,
    mutate,
  };
}

export function useUCPState(): SwrResult<UCPStateHandler> {
  const currentFolder = useCurrentGameFolder();
  const { t } = useTranslation('gui-download');

  const { data, error, mutate } = useSWRImmutable(
    SWR_KEYS.UCP_STATE,
    async () => ({
      state: (await Result.tryAsync(getUCPState, currentFolder))
        .ok()
        .getOrElse(UCPState.UNKNOWN),
      activate: async () => {
        const result = await activateUCP(currentFolder, t);
        mutate();
        return result;
      },
      deactivate: async () => {
        const result = await deactivateUCP(currentFolder, t);
        mutate();
        return result;
      },
    })
  );
  return {
    data,
    isLoading: !data,
    isError: !!error,
    mutate,
  };
}

export function useUCPVersion(): SwrResult<UCPVersion> {
  const currentFolder = useCurrentGameFolder();
  const { data, error, mutate } = useSWRImmutable(
    SWR_KEYS.UCP_VERSION,
    async () =>
      (await loadUCPVersion(currentFolder))
        .ok()
        .getOrReceive(getEmptyUCPVersion)
  );
  return {
    data,
    isLoading: !data,
    isError: !!error,
    mutate,
  };
}
