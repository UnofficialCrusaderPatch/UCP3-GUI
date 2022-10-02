import { FileEntry, readTextFile, readDir } from '@tauri-apps/api/fs';
import { proxyFsExists } from '../../renderer/util';
import yaml from 'yaml';

import { Definition, Extension } from '../../common/config/common';

const localeSensitiveFields = ['description', 'text', 'tooltip'];
const localeRegExp = new RegExp('^\\s*{{(.*)}}\\s*$');
async function readUISpec(folder: string, ext: Extension): Promise<void> {
    if (await proxyFsExists(`${folder}/ui.yml`)) {
      ext.ui = yaml.parse(
        await readTextFile(`${folder}/ui.yml`)
      );
    } else {
        ext.ui = [];
    }
  }

  async function readConfig(folder: string, ext: Extension): Promise<void> {
    if (await proxyFsExists(`${folder}/config.yml`)) {
      ext.config = yaml.parse(
        await readTextFile(`${folder}/config.yml`)
      );
    } else {
        ext.config = {};
    }
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
            obj[field] = loc;
          }
        }
      }
      if (typeof obj[field] === 'object') {
        changeLocale(locale, obj[field] as { [key: string]: unknown });
      }
    });
  }

  async function setLocale(folder: string, ext: Extension, language: string): Promise<void> {
    

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

const Discovery = {
  discoverExtensions: async (gameFolder: string) => {
    const currentLocale = 'English'; // Dummy location for this code

    const moduleDir = `${gameFolder}/ucp/modules`;
    const modDirEnts = await proxyFsExists(moduleDir)
      ? await readDir(moduleDir)
      : [];

    const pluginDir = `${gameFolder}/ucp/plugins`;
    const pluginDirEnts = await proxyFsExists(pluginDir)
      ? await readDir(pluginDir)
      : [];

    const dirEnts: FileEntry[] = [...modDirEnts, ...pluginDirEnts];

    return Promise.all(dirEnts
      .filter((d: FileEntry) => {
        return d.children;  // should be null/undefined if no dir
      })
      .map(async (d: FileEntry) => {
        const type = modDirEnts.indexOf(d) === -1 ? 'plugin' : 'module';

        const folder =
          type === 'module'
            ? `${gameFolder}/ucp/modules/${d.name}`
            : `${gameFolder}/ucp/plugins/${d.name}`;

        const def = yaml.parse(
          await readTextFile(`${folder}/definition.yml`)
        );
        const { name, version } = def;

        def.dependencies = def.depends || [];

        const ext = { name, version, type, def } as unknown as Extension;
        await readUISpec(folder, ext);
        await setLocale(folder, ext, currentLocale);
        await readConfig(folder, ext);

        return ext;
      })
    );
  },
};

export { Discovery };
