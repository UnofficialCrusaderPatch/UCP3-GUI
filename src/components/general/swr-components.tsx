import { useTranslation } from 'react-i18next';
import useSWR, { KeyedMutator } from 'swr';
import useSWRImmutable from 'swr/immutable'; // only fetches once
import { Event, UnlistenFn } from '@tauri-apps/api/event';
import { RecentFolderHelper } from '../../config/gui/recent-folder-helper';
import { getGuiConfigLanguage, setGuiConfigLanguage } from './tauri-invoke';
import { onLanguageChange } from './tauri-listen';
import {
  registerForWindowClose,
  unregisterForWindowClose,
} from '../../tauri/tauri-hooks';

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

// keys are used to identify and cache the request, so they need to be unique for different sources
const SWR_KEYS = {
  RECENT_FOLDERS: 'ucp.gui.recent.folders',
  LANGUAGE_LOAD: 'ucp.lang.load',
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
