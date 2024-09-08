import { FileEntry } from '@tauri-apps/api/fs';
import {
  readTextFile,
  receiveAssetUrl,
  resolvePath,
} from '../../tauri/tauri-files';
import { slashify } from '../../tauri/tauri-invoke';
import { getStore } from '../../hooks/jotai/base';

import { Extension } from '../../config/ucp/common';
import {
  CONFIGURATION_USER_REDUCER_ATOM,
  CONFIGURATION_FULL_REDUCER_ATOM,
} from '../../function/configuration/state';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../function/extensions/state/state';
import { LANGUAGE_ATOM } from '../../function/gui-settings/settings';

export async function getLanguage(): Promise<string> {
  return getStore().get(LANGUAGE_ATOM);
}

export function createGetLocalizedStringFunction(
  localization: Record<string, string>,
  fallbackLocalization: Record<string, string>,
): (id: string) => Promise<string> {
  return async (id: string) => localization[id] ?? fallbackLocalization[id];
}

export function createGetTextFileFunction(currentFolder: string) {
  return async (path: string) => {
    const sourcePath = await resolvePath(currentFolder, path);
    const textRes = await readTextFile(sourcePath);
    return textRes.isOk() ? textRes.ok().get() : null;
  };
}

export function createGetAssetUrlFunction(currentFolder: string) {
  return async (path: string) => receiveAssetUrl([currentFolder, path]);
}

export function createReceivePluginPathsFunction(currentFolder: string) {
  const { activeExtensions } = getStore().get(EXTENSION_STATE_REDUCER_ATOM);

  let gameFolder: string | null = null;
  return async (basePath: string, pathPattern: string) => {
    gameFolder = gameFolder ?? (await slashify(currentFolder));
    const result = await Promise.all(
      activeExtensions
        // Filter for plugins, since currently they are unpacked, modules can be found by the universal approach,
        // but we can not load data from packaged data into the game
        .filter((e) => e.type === 'plugin')
        .map(async (extension: Extension) => {
          let entries: FileEntry[] = [];
          let path: string = '';

          await extension.io.handle(async (extensionHandle) => {
            entries = await extensionHandle.listEntries(basePath, pathPattern);
            [, path] = extensionHandle.path.split(`${gameFolder}/`, 2);
          });

          const paths = entries.map((e) => e.path);

          return {
            description: { ...extension.definition, dependencies: undefined },
            path,
            paths,
          };
        }),
    );

    return result.filter(({ paths }) => paths.length > 0);
  };
}

export function createGetConfigStateFunction() {
  return async (url: string) =>
    getStore().get(CONFIGURATION_FULL_REDUCER_ATOM)[url];
}

function transformConfigsForCustomMenu(
  urlPrefix: string,
  configs: Record<string, unknown>,
) {
  return Object.fromEntries(
    Object.entries(configs)
      .filter(([url]) => url.startsWith(urlPrefix))
      .map(([url, config]) => [url.replace(urlPrefix, ''), config]),
  );
}

export function createGetCurrentConfigFunction(baseUrl: string) {
  const urlPrefix = `${baseUrl}.`;
  return async () => {
    const baseline = getStore().get(EXTENSION_STATE_REDUCER_ATOM).configuration
      .state;
    const transformedBaseline = transformConfigsForCustomMenu(
      urlPrefix,
      baseline,
    );
    const userConfig = getStore().get(CONFIGURATION_USER_REDUCER_ATOM);
    const transformedUserConfig = transformConfigsForCustomMenu(
      urlPrefix,
      userConfig,
    );
    return {
      baseline: transformedBaseline,
      user: transformedUserConfig,
    };
  };
}
