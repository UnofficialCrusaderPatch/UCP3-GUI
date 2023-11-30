import { FileEntry } from '@tauri-apps/api/fs';
import { Extension } from 'config/ucp/common';
import { getExtensionHandles } from 'function/extensions/discovery';
import { ExtensionHandle } from 'function/extensions/extension-handles/extension-handle';
import { EXTENSION_STATE_REDUCER_ATOM } from 'function/global/global-atoms';
import { getStore } from 'hooks/jotai/base';
import i18next from 'i18next';
import { useAtomValue } from 'jotai';
import { readTextFile, receiveAssetUrl, resolvePath } from 'tauri/tauri-files';
import Logger from 'util/scripts/logging';

const LOGGER = new Logger('sandbox-menu-functions.ts');

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
export async function createReceivePluginPathsFunction(currentFolder: string) {
  const { activeExtensions } = getStore().get(EXTENSION_STATE_REDUCER_ATOM);

  return async (basePath: string, pathPattern: string) => {
    const pattern =
      basePath.length > 0 ? `${basePath}/${pathPattern}` : pathPattern;

    const result = await Promise.all(
      activeExtensions.map(async (extension: Extension) => {
        let entries: FileEntry[] = [];
        let path: string = '';

        await extension.io(async (extensionHandle) => {
          entries = await extensionHandle.listEntries(pattern);
          [, path] = extensionHandle.path.split(`${currentFolder}/`);
        });

        return {
          path,
          paths: entries.map((e) => e.path),
        };
      }),
    );

    return result.filter(({ paths }) => paths.length > 0);
  };
}

// TODO, based on config
export function createGetConfigStateFunction(overallConfig: unknown) {
  return async (url: string) => null;
}

export function createGetCurrentConfigFunction(
  currentConfig: Record<string, unknown>, // combination of url and values
) {
  return async () => currentConfig;
}
