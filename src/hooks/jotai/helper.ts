import { Extension } from 'config/ucp/common';
import {
  extensionsToOptionEntries,
  getConfigDefaults,
  getExtensions,
} from 'config/ucp/extension-util';
import { activateUCP, deactivateUCP } from 'function/ucp/ucp-state';
import { UCPVersion } from 'function/ucp/ucp-version';
import { useTranslation } from 'react-i18next';
import Option from 'util/structs/option';
import Result from 'util/structs/result';
import { info } from 'util/scripts/logging';
import {
  useFolder,
  useInitRunning,
  useSetInitDone,
  useSetUcpConfigFile,
  useSetExtensions,
  useSetConfiguration,
  useSetConfigurationDefaults,
  useSetExtensionState,
  useFolderValue,
  useSetConfigurationTouched,
  useSetConfigurationWarnings,
  useSetActiveExtensions,
} from './globals-wrapper';
import {
  UCPStateHandler,
  useLanguageHook,
  useUCPStateHook,
  useUCPVersionHook,
} from './hooks';

export function useCurrentGameFolder() {
  return useFolderValue(); // only a proxy
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
  boolean,
  (newFolder: string, language: string) => Promise<void>
] {
  const setInitDone = useSetInitDone();
  const [isInitRunning, setInitRunning] = useInitRunning();
  const setFile = useSetUcpConfigFile();
  const setExtensions = useSetExtensions();
  const setConfiguration = useSetConfiguration();
  const setConfigurationDefaults = useSetConfigurationDefaults();
  const setExtensionsState = useSetExtensionState();

  // currently simply reset:
  const setConfigurationTouched = useSetConfigurationTouched();
  const setConfigurationWarnings = useSetConfigurationWarnings();
  const setActiveExtensions = useSetActiveExtensions();

  return [
    isInitRunning,
    async (newFolder: string, language: string) => {
      setInitRunning(true);
      setInitDone(false);

      let extensions: Extension[] = [];
      let defaults = {};
      let file = '';
      if (newFolder.length > 0) {
        info(`Current folder: ${newFolder}`);
        info(`Current locale: ${language}`);

        // TODO: currently only set on initial render and folder selection
        // TODO: resolve this type badness
        extensions = await getExtensions(newFolder, language);
        setExtensions(extensions);

        // TODO: this should not be done now, it only makes sense when options are actually presented on screen, e.g., when an extension is made active
        // const optionEntries = extensionsToOptionEntries(extensions);
        // defaults = getConfigDefaults(optionEntries);
        defaults = {};
        file = `${newFolder}/ucp-config.yml`; // better be moved to const file?
      } else {
        info('No folder active.');
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
      // currently simply reset:
      setConfigurationTouched({
        type: 'reset',
        value: defaults,
      });
      setConfigurationWarnings({
        type: 'reset',
        value: defaults,
      });

      setExtensionsState({
        allExtensions: [...extensions],
        activeExtensions: [],
        activatedExtensions: [],
        installedExtensions: [...extensions],
      });
      setFile(file);

      setActiveExtensions([]);

      info('Finished loading');
      setInitDone(true);
      setInitRunning(false);
    },
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
  const [isInitRunning, initConfig] = useInitGlobalConfiguration();

  return [
    currentFolder,
    async (newFolder: string) => {
      // kinda bad, it might skip a folder switch
      if (
        stateResult.isEmpty() ||
        versionResult.isEmpty() ||
        languageState.isEmpty() ||
        isInitRunning
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
