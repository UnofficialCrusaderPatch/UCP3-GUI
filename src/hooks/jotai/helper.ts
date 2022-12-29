import { activateUCP, deactivateUCP } from 'function/ucp/ucp-state';
import { UCPVersion } from 'function/ucp/ucp-version';
import { useCurrentGameFolder } from 'hooks/general/hooks';
import { useSearchParamsCustom } from 'hooks/general/util';
import { useTranslation } from 'react-i18next';
import { getGameFolderPath } from 'tauri/tauri-files';
import Option from 'util/structs/option';
import Result from 'util/structs/result';
import {
  UCPStateHandler,
  useLanguageHook,
  useUCPStateHook,
  useUCPVersionHook,
} from './hooks';

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

export function useGameFolder(): [
  string,
  (newFolder: string) => Promise<void>
] {
  const [searchParams, setSearchParams] = useSearchParamsCustom();
  const currentFolder = getGameFolderPath(searchParams);

  const [stateResult, receiveState] = useUCPStateHook(currentFolder);
  const [versionResult, receiveVersion] = useUCPVersionHook(currentFolder);

  return [
    getGameFolderPath(searchParams),
    async (newFolder: string) => {
      // kinda bad, it might skip a folder switch
      if (stateResult.isEmpty() || versionResult.isEmpty()) {
        return;
      }
      setSearchParams({ directory: newFolder });
      await receiveState(newFolder);
      await receiveVersion(newFolder);
    },
  ];
}
