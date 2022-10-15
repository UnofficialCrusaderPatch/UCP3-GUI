import { useEffect, useState } from 'react';
import { TFunction, useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import { KeyedMutator } from 'swr';
import useSWRImmutable from 'swr/immutable'; // only fetches once
import { GuiConfigHandler } from './gui-config-handling';
import { registerForWindowClose } from './tauri-hooks';
import { customUseSearchParams } from './util-components';

interface SwrResult<T> {
  data: T | undefined;
  isLoading: boolean;
  isError: boolean;
  mutate: KeyedMutator<T>;
}

// keys are used to identify and cache the request, so they need to be unique for different sources
const SWR_KEYS = {
  GUI_CONFIG: 'ucp.gui.config',
  LANGUAGE_LOAD: 'ucp.lang.load',
};

// eslint-disable-next-line import/prefer-default-export
export function useGuiConfig(): SwrResult<GuiConfigHandler> {
  const [searchParams, setSearchParams] = customUseSearchParams();

  const { data, error, mutate } = useSWRImmutable(
    SWR_KEYS.GUI_CONFIG,
    async () => {
      const guiConfig = new GuiConfigHandler();
      await guiConfig.loadGuiConfig();

      const currentLanguage = searchParams.get('lang');
      if (currentLanguage) {
        guiConfig.setLanguage(currentLanguage);
      } else {
        const loadedLang = guiConfig.getLanguage();
        setSearchParams({ lang: loadedLang || 'en' });
      }

      registerForWindowClose(SWR_KEYS.GUI_CONFIG, async () => {
        // Currently, only the Landing Page loads the GUI config
        // this would change, if a language switch would be added to the editor,
        // then, the editor window would also save the config on close,
        // to really handle this, either the settings are limited to landing, or
        // the GuiConfig would need to move the handling to a Singleton in Rust
        await guiConfig.saveGuiConfig(); // no idea if need to keep object binding
      });
      return guiConfig;
    }
  );
  return {
    data,
    isLoading: !data,
    isError: !!error,
    mutate,
  };
}

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
