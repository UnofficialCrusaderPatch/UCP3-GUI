import { useEffect } from 'react';
import { TFunction, useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import useSWR, { KeyedMutator } from 'swr';
import useSWRImmutable from 'swr/immutable'; // only fetches once
import { RecentFolderHelper } from './gui-config-handling';

interface SwrResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  mutate: KeyedMutator<T>;
}

// keys are used to identify and cache the request, so they need to be unique for different sources
const SWR_KEYS = {
  RECENT_FOLDERS: 'ucp.gui.recent.folders',
  LANGUAGE_LOAD: 'ucp.lang.load',
};

// eslint-disable-next-line import/prefer-default-export
export function useRecentFolders(): SwrResult<RecentFolderHelper> {
  // normal swr, since refetching is ok
  const { data, error, mutate } = useSWR(SWR_KEYS.RECENT_FOLDERS, async () => {
    const recentFolderHelper = new RecentFolderHelper();
    await recentFolderHelper.loadRecentFolders();
    return recentFolderHelper;
  });
  return {
    data,
    isLoading: !data,
    isError: !!error,
    mutate,
  };
}

// TODO: remove language from url and use backend
export function useLanguage(): SwrResult<TFunction> {
  const [searchParams] = useSearchParams();
  const { i18n } = useTranslation();
  const paramLanguage = searchParams.get('lang');

  const changeLanguage = async () =>
    i18n.changeLanguage(paramLanguage || undefined);
  const { data, error, mutate } = useSWRImmutable(
    SWR_KEYS.LANGUAGE_LOAD,
    changeLanguage
  );

  // always executed
  useEffect(() => {
    if ((data || error) && paramLanguage && i18n.language !== paramLanguage) {
      mutate(null as unknown as undefined, true); // should force data to be undefined, maybe
    }
  });
  return {
    data,
    isLoading: !data,
    isError: !!error,
    mutate,
  };
}
