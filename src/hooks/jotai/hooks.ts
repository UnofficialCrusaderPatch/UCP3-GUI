import { Event, TauriEvent, UnlistenFn } from '@tauri-apps/api/event';
import { onLanguageChange } from 'tauri/tauri-listen';
import { getGuiConfigLanguage, setGuiConfigLanguage } from 'tauri/tauri-invoke';
import { RecentFolderHelper } from 'config/gui/recent-folder-helper';
import {
  registerTauriEventListener,
  removeTauriEventListener,
} from 'tauri/tauri-hooks';
import { getUCPState, UCPState } from 'function/ucp/ucp-state';
import Result from 'util/structs/result';
import { getEmptyUCPVersion, loadUCPVersion } from 'function/ucp/ucp-version';
import {
  createFunctionForAsyncAtomWithMutate,
  createHookInitializedFunctionForAsyncAtomWithMutate,
} from 'hooks/jotai/base';
import { i18n as i18nInterface } from 'i18next';
import {
  extensionsToOptionEntries,
  getConfigDefaults,
  getExtensions,
} from 'config/ucp/extension-util';
import { Extension } from 'config/ucp/common';
import {
  useConfigurationDefaultsReducer,
  useConfigurationReducer,
  useExtensionsReducer,
  useExtensionStateReducer,
  useInitDone,
} from './globals-wrapper';

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

export const useRecentFolders = createFunctionForAsyncAtomWithMutate<
  RecentFolderHelper,
  []
>(async () => {
  const recentFolderHelper = new RecentFolderHelper();
  // the folders will only be loaded once, so multiple landing pages will not work
  // since the object here needs to copy the backend behavior and will not query again
  await recentFolderHelper.loadRecentFolders();
  return recentFolderHelper;
});

export const useLanguageHook =
  createHookInitializedFunctionForAsyncAtomWithMutate<
    Language,
    [i18nInterface]
  >(async (prev: undefined | Language, i18n: i18nInterface) => {
    let lang = await getGuiConfigLanguage();
    i18n.changeLanguage(lang || undefined);
    const unlistenFunc = await onLanguageChange((langEvent: Event<string>) => {
      lang = langEvent.payload;
      i18n.changeLanguage(lang || undefined);
    });

    if (prev?.unlistenChangeEvent) {
      removeTauriEventListener(
        TauriEvent.WINDOW_CLOSE_REQUESTED,
        prev.unlistenChangeEvent
      );
    }
    registerTauriEventListener(TauriEvent.WINDOW_CLOSE_REQUESTED, unlistenFunc);
    return {
      getLanguage: () => lang,
      setLanguage: setGuiConfigLanguage,
      unlistenChangeEvent: unlistenFunc, // before a receiving mutate, unlisten needs to be called
    };
  });

export const useUCPStateHook =
  createHookInitializedFunctionForAsyncAtomWithMutate(
    async (_prev, currentFolder: string) =>
      (await Result.tryAsync(getUCPState, currentFolder))
        .ok()
        .getOrElse(UCPState.UNKNOWN)
  );

export const useUCPVersionHook =
  createHookInitializedFunctionForAsyncAtomWithMutate(
    async (_prev, currentFolder: string) =>
      (await loadUCPVersion(currentFolder))
        .ok()
        .getOrReceive(getEmptyUCPVersion)
  );

export const useInitGlobalConfigurationHook =
  createHookInitializedFunctionForAsyncAtomWithMutate(
    async (
      _prev,
      newState: {
        newFolder: string;
        language: string;
        globalHooks: {
          initDone: ReturnType<typeof useInitDone>;
          configurationReducer: ReturnType<typeof useConfigurationReducer>;
          extensionsReducer: ReturnType<typeof useExtensionsReducer>;
          configurationDefaultsReducer: ReturnType<
            typeof useConfigurationDefaultsReducer
          >;
          extensionStateReducer: ReturnType<typeof useExtensionStateReducer>;
        };
      }
    ) => {
      const { newFolder, language, globalHooks } = newState;
      const [, setInitDone] = globalHooks.initDone;
      const [, setExtensions] = globalHooks.extensionsReducer;
      const [, setConfiguration] = globalHooks.configurationReducer;
      const [, setConfigurationDefaults] =
        globalHooks.configurationDefaultsReducer;
      const [, setExtensionsState] = globalHooks.extensionStateReducer;

      setInitDone(false);

      let extensions: Extension[] = [];
      let defaults = {};
      if (newFolder.length > 0) {
        console.log(`Current folder: ${newFolder}`);
        console.log(`Current locale: ${language}`);

        // TODO: currently only set on initial render and folder selection
        // TODO: resolve this type badness
        extensions = await getExtensions(newFolder, language);
        setExtensions(extensions);

        const optionEntries = extensionsToOptionEntries(extensions);
        defaults = getConfigDefaults(optionEntries);
      } else {
        console.log('No folder active.');
      }

      setExtensions(extensions);
      setConfiguration({
        type: 'reset',
        value: defaults,
      });
      setConfigurationDefaults({
        type: 'reset',
        value: defaults,
      });
      setExtensionsState({
        allExtensions: [...extensions],
        activeExtensions: [],
        activatedExtensions: [],
        installedExtensions: [...extensions],
      });

      console.log('Finished loading');
      setInitDone(true);
    }
  );
