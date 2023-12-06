import { FileEntry } from '@tauri-apps/api/fs';
import { Extension } from 'config/ucp/common';
import {
  CONFIGURATION_REDUCER_ATOM,
  EXTENSION_STATE_REDUCER_ATOM,
} from 'function/global/global-atoms';
import { getStore } from 'hooks/jotai/base';
import i18next from 'i18next';
import { readTextFile, receiveAssetUrl, resolvePath } from 'tauri/tauri-files';
import { slashify } from 'tauri/tauri-invoke';

export async function getLanguage(): Promise<string> {
  return i18next.language; // is kinda enough, using the hook might be overkill
}

export function createGetLocalizedStringFunction(
  localization: Record<string, string>,
): (id: string) => Promise<string> {
  return async (id: string) => localization[id];
}

export function createGetTextFileFunction(currentFolder: string) {
  return async (path: string) => {
    const sourcePath = await resolvePath(currentFolder, path);
    const textRes = await readTextFile(sourcePath);
    return textRes.isOk() ? textRes.ok().get() : null;
  };
}

export function createGetAssetUrlFunction(currentFolder: string) {
  return async (path: string) => receiveAssetUrl(currentFolder, path);
}

// TODO
// should be called with a base path (in the plugin folder) and a path pattern and
// receive an array or a map of objects,
// each containing and object with information to the plugin is was found in and
// an array/object of path objects with the (relative to current folder) and
// all other requested groups, idea:
/*
 [
    {
        name: "plugin-name",
        version: 0.0.0,
        path: "..." // relative path to plugin
        ... // other?,
        paths: [ // paths that fitted the pattern
            {
                path: "...", // relative to game folder
                pluginPath: "...", // relative to plugin
                ... // either here all groups from the path, or as:
                groups: {
                    ...
                }
            },
            ...
        ]
    },
    ...
 ]
*/
export function createReceivePluginPathsFunction(currentFolder: string) {
  const { activeExtensions } = getStore().get(EXTENSION_STATE_REDUCER_ATOM);

  let gameFolder: string | null = null;
  return async (basePath: string, pathPattern: string) => {
    gameFolder = gameFolder ?? (await slashify(currentFolder));
    const result = await Promise.all(
      activeExtensions
        // // Module paths cannot be returned usually because they live inside zip files?
        // .filter((e) => e.type === 'plugin')
        .map(async (extension: Extension) => {
          let entries: FileEntry[] = [];
          let path: string = '';

          await extension.io.handle(async (extensionHandle) => {
            entries = await extensionHandle.listEntries(basePath, pathPattern);
            [, path] = extensionHandle.path.split(`${gameFolder}/`, 2);
          });

          const paths = entries.map((e) => e.path);

          return {
            extension: JSON.parse(JSON.stringify(extension)),
            path,
            paths,
          };
        }),
    );

    return result.filter(({ paths }) => paths.length > 0);
  };
}

export function createGetConfigStateFunction() {
  return async (url: string) => getStore().get(CONFIGURATION_REDUCER_ATOM)[url];
}

export function createGetCurrentConfigFunction(baseUrl: string) {
  const urlPrefix = `${baseUrl}.`;
  return async () => {
    const baseline = getStore().get(EXTENSION_STATE_REDUCER_ATOM).configuration
      .state;
    const filteredBaseline = Object.fromEntries(
      Object.entries(baseline).filter(([url]) => url.startsWith(urlPrefix)),
    );
    const userConfig = getStore().get(CONFIGURATION_REDUCER_ATOM);
    const filteredUserConfig = Object.fromEntries(
      Object.entries(userConfig).filter(([url]) => url.startsWith(urlPrefix)),
    );
    return {
      baseline: filteredBaseline,
      user: filteredUserConfig,
    };
  };
}
