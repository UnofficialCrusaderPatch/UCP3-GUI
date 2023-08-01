// eslint-disable-next-line max-classes-per-file
import type { FileEntry } from '@tauri-apps/api/fs';
import yaml from 'yaml';

import { readDir } from 'tauri/tauri-files';

import { ConfigEntry, Extension, OptionEntry } from 'config/ucp/common';
import { info } from 'util/scripts/logging';
import ExtensionHandle from './extension-handle';
import ZipExtensionHandle from './rust-zip-extension-handle';
import DirectoryExtensionHandle from './directory-extension-handle';
import { changeLocale } from './locale';

const OPTIONS_FILE = 'options.yml';
const CONFIG_FILE = 'config.yml';
const DEFINITION_FILE = 'definition.yml';
const LOCALE_FOLDER = 'locale';

async function readUISpec(
  eh: ExtensionHandle
): Promise<{ options: { [key: string]: unknown }[] }> {
  if (await eh.doesEntryExist(OPTIONS_FILE)) {
    return yaml.parse(await eh.getTextContents(OPTIONS_FILE));
  }
  return { options: [] };
}

async function readConfig(
  eh: ExtensionHandle
): Promise<{ [key: string]: unknown }> {
  if (await eh.doesEntryExist(CONFIG_FILE)) {
    return yaml.parse(await eh.getTextContents(CONFIG_FILE));
  }
  return {};
}

async function setLocale(
  eh: ExtensionHandle,
  ext: Extension,
  language: string
): Promise<void> {
  // TODO: folder checking is broken. Why?
  const locFolder = await eh.doesEntryExist(`${LOCALE_FOLDER}/`);
  if (locFolder) {
    if (await eh.doesEntryExist(`${LOCALE_FOLDER}/${language}.yml`)) {
      const locale = yaml.parse(
        await eh.getTextContents(`${LOCALE_FOLDER}/${language}.yml`)
      );

      ext.ui.forEach((uiElement) => {
        changeLocale(locale, uiElement as { [key: string]: unknown });
      });
    } else {
      console.log(
        `No locale file found for: ${ext.name}: ${LOCALE_FOLDER}/${language}.yml`
      );
    }
  }
}

function collectOptionEntries(
  obj: { [key: string]: unknown },
  extensionName: string,
  collection?: { [key: string]: OptionEntry }
) {
  // eslint-disable-next-line no-param-reassign
  if (collection === undefined) collection = {};

  // WHY IS typeof(null) == 'object'
  if (typeof obj === 'object' && obj !== null) {
    if (obj.url !== undefined && obj.url !== null) {
      const oeObj = obj as OptionEntry;
      if (collection[oeObj.url] !== undefined) {
        throw new Error(`url already has a value: ${oeObj.url}`);
      }
      let colURL = oeObj.url;
      if (colURL.indexOf(`${extensionName}.`) !== 0) {
        colURL = `${extensionName}.${colURL}`;
      }
      // eslint-disable-next-line no-param-reassign
      collection[colURL] = oeObj;
    } else {
      Object.keys(obj).forEach((key: string) => {
        collectOptionEntries(
          obj[key] as { [key: string]: unknown },
          extensionName,
          collection
        );
      });
    }
  }
  return collection;
}

function collectConfigEntries(
  obj: { contents: unknown; [key: string]: unknown },
  url?: string,
  collection?: { [key: string]: ConfigEntry }
) {
  // eslint-disable-next-line no-param-reassign
  if (collection === undefined) collection = {};
  // eslint-disable-next-line no-param-reassign
  if (url === undefined) url = '';

  if (obj !== null && obj !== undefined && typeof obj === 'object') {
    if (obj.value !== undefined) {
      const o = obj as ConfigEntry;
      if (collection[url] !== undefined) {
        throw new Error(`url already has a value: ${url}`);
      }
      // eslint-disable-next-line no-param-reassign
      collection[url] = o.contents as unknown as ConfigEntry;
    } else {
      Object.keys(obj).forEach((key) => {
        let newUrl = url;
        if (newUrl === undefined) newUrl = '';
        if (newUrl !== '') {
          newUrl += '.';
        }
        newUrl += key;
        collectConfigEntries(
          obj[key] as { contents: unknown; [key: string]: unknown },
          newUrl,
          collection
        );
      });
    }
  }

  return collection;
}

async function getExtensionHandles(ucpFolder: string) {
  const moduleDir = `${ucpFolder}/modules/`;
  const modDirEnts = (await readDir(moduleDir)).ok().getOrReceive(() => []);

  const pluginDir = `${ucpFolder}/plugins/`;
  const pluginDirEnts = (await readDir(pluginDir)).ok().getOrReceive(() => []);

  const de: FileEntry[] = [...modDirEnts, ...pluginDirEnts].filter(
    (fe) =>
      (fe.name || '').endsWith('.zip') ||
      (fe.children !== null && fe.children !== undefined)
  );
  const den = de.map((f) => f.name);
  const dirEnts = de.filter((e) => {
    // Zip files supersede folders
    // const isDirectory = e.children !== null && e.children !== undefined;
    // if (isDirectory) {
    //   const zipFileName = `${e.name}.zip`;
    //   if (den.indexOf(zipFileName) !== -1) {
    //     return false;
    //   }
    // }
    // Folders supersede zip files?
    if (e.name?.endsWith('.zip')) {
      const dirName = e.name.split('.zip')[0];
      if (den.indexOf(`${dirName}`) !== -1) {
        return false;
      }
    }
    return true;
  });

  const exts = await Promise.all(
    dirEnts.map(async (fe: FileEntry) => {
      const type = modDirEnts.indexOf(fe) === -1 ? 'plugin' : 'module';

      const folder =
        type === 'module'
          ? `${ucpFolder}/modules/${fe.name}`
          : `${ucpFolder}/plugins/${fe.name}`;

      if (fe.name !== undefined && fe.name.endsWith('.zip')) {
        // TODO: Do hash check here!
        const result = await ZipExtensionHandle.fromPath(folder);
        return result as ExtensionHandle;
      }
      if (fe.children !== null) {
        // fe is a directory
        return new DirectoryExtensionHandle(folder) as ExtensionHandle;
      }
      throw new Error(`${folder} not a valid extension directory`);
    })
  );

  return exts;
}

const Discovery = {
  discoverExtensions: async (
    gameFolder: string,
    locale?: string
  ): Promise<Extension[]> => {
    info(`Discovering extensions`);

    const ehs = await getExtensionHandles(`${gameFolder}/ucp/`);

    return Promise.all(
      ehs.map(async (eh) => {
        const type = eh.path.indexOf('/modules/') ? 'module' : 'plugin';
        const definition = yaml.parse(
          await eh.getTextContents(`${DEFINITION_FILE}`)
        );
        const { name, version } = definition;

        definition.dependencies = definition.depends || [];

        const ext = {
          name,
          version,
          type,
          definition,
        } as unknown as Extension;

        const uiRaw = await readUISpec(eh);
        ext.ui = (uiRaw || {}).options || [];
        await setLocale(eh, ext, locale || 'en');
        ext.config = await readConfig(eh);

        ext.optionEntries = collectOptionEntries(
          ext.ui as unknown as { [key: string]: unknown },
          ext.name
        );

        ext.configEntries = {
          ...collectConfigEntries(
            ext.config.modules as { [key: string]: unknown; contents: unknown }
          ),
          ...collectConfigEntries(
            ext.config.plugins as { [key: string]: unknown; contents: unknown }
          ),
        };

        eh.close();

        return ext;
      })
    );
  },
};

// eslint-disable-next-line import/prefer-default-export
export { Discovery };
