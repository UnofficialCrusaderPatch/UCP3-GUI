import type { FileEntry } from '@tauri-apps/api/fs';
import { readTextFile, readDir } from '@tauri-apps/api/fs';
import yaml from 'yaml';
import { proxyFsExists } from '../../renderer/utils/fs-utils';

import {
  ConfigEntry,
  Definition,
  Extension,
  OptionEntry,
} from '../../common/config/common';

const localeSensitiveFields = ['description', 'text', 'tooltip'];
const localeRegExp = /^\s*{{(.*)}}\s*$/;

async function readUISpec(
  folder: string
): Promise<{ [key: string]: unknown }[]> {
  if (await proxyFsExists(`${folder}/ui.yml`)) {
    return yaml.parse(await readTextFile(`${folder}/ui.yml`));
  }
  return [];
}

async function readConfig(folder: string): Promise<{ [key: string]: unknown }> {
  if (await proxyFsExists(`${folder}/config.yml`)) {
    return yaml.parse(await readTextFile(`${folder}/config.yml`));
  }
  return {};
}

function changeLocale(
  locale: { [key: string]: string },
  obj: { [key: string]: unknown }
): void {
  localeSensitiveFields.forEach((field) => {
    if (typeof obj[field] === 'string') {
      const search = localeRegExp.exec(obj[field] as string);

      if (search !== undefined && search !== null) {
        const keyword = search[1];
        const loc = locale[keyword];
        if (loc !== undefined) {
          // eslint-disable-next-line no-param-reassign
          obj[field] = loc;
        }
      }
    }
    if (typeof obj[field] === 'object') {
      changeLocale(locale, obj[field] as { [key: string]: unknown });
    }
  });
}

async function setLocale(
  folder: string,
  ext: Extension,
  language: string
): Promise<void> {
  if (await proxyFsExists(`${folder}/locale`)) {
    if (await proxyFsExists(`${folder}/locale/${language}.json`)) {
      const locale = JSON.parse(
        await readTextFile(`${folder}/locale/${language}.json`)
      );

      ext.ui.forEach((uiElement) => {
        changeLocale(locale, uiElement as { [key: string]: unknown });
      });
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

  if (typeof obj === 'object') {
    if (obj.url !== undefined) {
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
  obj: { value: unknown; [key: string]: unknown },
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
      collection[url] = o;
    } else {
      Object.keys(obj).forEach((key) => {
        let newUrl = url;
        if (newUrl === undefined) newUrl = '';
        if (newUrl !== '') {
          newUrl += '.';
        }
        newUrl += key;
        collectConfigEntries(
          obj[key] as { value: unknown; [key: string]: unknown },
          newUrl,
          collection
        );
      });
    }
  }

  return collection;
}

const Discovery = {
  discoverExtensions: async (gameFolder: string): Promise<Extension[]> => {
    const currentLocale = 'English'; // Dummy location for this code

    const moduleDir = `${gameFolder}/ucp/modules`;
    const modDirEnts = (await proxyFsExists(moduleDir))
      ? await readDir(moduleDir)
      : [];

    const pluginDir = `${gameFolder}/ucp/plugins`;
    const pluginDirEnts = (await proxyFsExists(pluginDir))
      ? await readDir(pluginDir)
      : [];

    const dirEnts: FileEntry[] = [...modDirEnts, ...pluginDirEnts];

    return Promise.all(
      dirEnts
        .filter(
          (d: FileEntry) => d.children // should be null/undefined if no dir
        )
        .map(async (d: FileEntry) => {
          const type = modDirEnts.indexOf(d) === -1 ? 'plugin' : 'module';

          const folder =
            type === 'module'
              ? `${gameFolder}/ucp/modules/${d.name}`
              : `${gameFolder}/ucp/plugins/${d.name}`;

          const definition = yaml.parse(
            await readTextFile(`${folder}/definition.yml`)
          );
          const { name, version } = definition;

          definition.dependencies = definition.depends || [];

          const ext = {
            name,
            version,
            type,
            definition,
          } as unknown as Extension;
          ext.ui = await readUISpec(folder);
          await setLocale(folder, ext, currentLocale);
          ext.config = await readConfig(folder);

          ext.optionEntries = collectOptionEntries(
            ext.ui as unknown as { [key: string]: unknown },
            ext.name
          );

          ext.configEntries = {
            ...collectConfigEntries(
              ext.config.modules as { [key: string]: unknown; value: unknown }
            ),
            ...collectConfigEntries(
              ext.config.plugins as { [key: string]: unknown; value: unknown }
            ),
          };

          return ext;
        })
    );
  },
};

// eslint-disable-next-line import/prefer-default-export
export { Discovery };
