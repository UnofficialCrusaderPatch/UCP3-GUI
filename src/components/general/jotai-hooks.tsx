import { useTranslation } from 'react-i18next';
import { Event, TauriEvent, UnlistenFn } from '@tauri-apps/api/event';
import { onLanguageChange } from 'tauri/tauri-listen';
import { getGuiConfigLanguage, setGuiConfigLanguage } from 'tauri/tauri-invoke';
import { RecentFolderHelper } from 'config/gui/recent-folder-helper';
import {
  registerTauriEventListener,
  removeTauriEventListener,
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
import {
  createFunctionForAsyncAtomWithMutate,
  createHookInitializedFunctionForAsyncAtomWithMutate,
} from 'util/scripts/jotai-util';
import { i18n as i18nInterface } from 'i18next';
import Option from 'util/structs/option';
import { useCurrentGameFolder } from './hooks';

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

const useLanguageHook = createHookInitializedFunctionForAsyncAtomWithMutate<
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
export function useLanguage() {
  const { i18n } = useTranslation();
  const [languageState] = useLanguageHook(i18n);
  return languageState;
}

const useUCPStateHook = createHookInitializedFunctionForAsyncAtomWithMutate(
  async (_prev, currentFolder: string) =>
    (await Result.tryAsync(getUCPState, currentFolder))
      .ok()
      .getOrElse(UCPState.UNKNOWN)
);
export function useUCPState(): [
  Option<Result<UCPStateHandler, unknown>>,
  () => Promise<void>
] {
  const currentFolder = useCurrentGameFolder();
  const { t } = useTranslation('gui-download');
  const [ucpStateResult, receiveState] = useUCPStateHook(currentFolder);

  const ucpStateHandlerResult = ucpStateResult.map((res) =>
    res.mapOk((state) => ({
      state,
      activate: async () => {
        const result = await activateUCP(currentFolder, t);
        receiveState(currentFolder);
        return result;
      },
      deactivate: async () => {
        const result = await deactivateUCP(currentFolder, t);
        receiveState(currentFolder);
        return result;
      },
    }))
  );
  return [ucpStateHandlerResult, () => receiveState(currentFolder)];
}

const useUCPVersionHook = createHookInitializedFunctionForAsyncAtomWithMutate(
  async (_prev, currentFolder: string) =>
    (await loadUCPVersion(currentFolder)).ok().getOrReceive(getEmptyUCPVersion)
);
export function useUCPVersion(): [
  Option<Result<UCPVersion, unknown>>,
  () => Promise<void>
] {
  const currentFolder = useCurrentGameFolder();
  const [ucpVersionResult, receiveVersion] = useUCPVersionHook(currentFolder);
  return [ucpVersionResult, () => receiveVersion(currentFolder)];
}
