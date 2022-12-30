import { activateUCP, deactivateUCP } from 'function/ucp/ucp-state';
import { UCPVersion } from 'function/ucp/ucp-version';
import { useTranslation } from 'react-i18next';
import Option from 'util/structs/option';
import Result from 'util/structs/result';
import {
  useConfigurationDefaultsReducer,
  useConfigurationReducer,
  useExtensionsReducer,
  useExtensionStateReducer,
  useFolder,
  useInitDone,
} from './globals-wrapper';
import {
  UCPStateHandler,
  useInitGlobalConfigurationHook,
  useLanguageHook,
  useUCPStateHook,
  useUCPVersionHook,
} from './hooks';

export function useCurrentGameFolder() {
  return useFolder()[0];
}

export function useLanguage() {
  const { i18n } = useTranslation();
  const [languageState] = useLanguageHook(i18n);
  return languageState;
}

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

export function useUCPVersion(): [
  Option<Result<UCPVersion, unknown>>,
  () => Promise<void>
] {
  const currentFolder = useCurrentGameFolder();
  const [ucpVersionResult, receiveVersion] = useUCPVersionHook(currentFolder);
  return [ucpVersionResult, () => receiveVersion(currentFolder)];
}

export function useInitGlobalConfiguration(): [
  Option<Result<void, unknown>>,
  (newFolder: string, language: string) => Promise<void>
] {
  const initDoneHook = useInitDone();
  const configurationReducerHook = useConfigurationReducer();
  const extensionsReducerHook = useExtensionsReducer();
  const configurationDefaultsReducerHook = useConfigurationDefaultsReducer();
  const extensionStateReducerHook = useExtensionStateReducer();

  const globalHooks = {
    initDone: initDoneHook,
    configurationReducer: configurationReducerHook,
    extensionsReducer: extensionsReducerHook,
    configurationDefaultsReducer: configurationDefaultsReducerHook,
    extensionStateReducer: extensionStateReducerHook,
  };

  const [res, init] = useInitGlobalConfigurationHook({
    newFolder: '',
    language: '',
    globalHooks,
  });

  return [
    res,
    async (newFolder: string, language: string) =>
      init({ newFolder, language, globalHooks }),
  ];
}

export function useGameFolder(): [
  string,
  (newFolder: string) => Promise<void>
] {
  const [currentFolder, setCurrentFolder] = useFolder();

  const [stateResult, receiveState] = useUCPStateHook(currentFolder);
  const [versionResult, receiveVersion] = useUCPVersionHook(currentFolder);

  const languageState = useLanguage();
  const [initResult, initConfig] = useInitGlobalConfiguration();

  return [
    currentFolder,
    async (newFolder: string) => {
      // kinda bad, it might skip a folder switch
      if (
        stateResult.isEmpty() ||
        versionResult.isEmpty() ||
        languageState.isEmpty() ||
        initResult.isEmpty()
      ) {
        return;
      }
      setCurrentFolder(newFolder);
      await receiveState(newFolder);
      await receiveVersion(newFolder);
      await initConfig(
        newFolder,
        languageState
          .get()
          .ok()
          .map((ok) => ok.getLanguage())
          .notUndefinedOrNull()
          .getOrElse('')
      );
    },
  ];
}
