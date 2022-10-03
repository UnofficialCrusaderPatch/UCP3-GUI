import { FileEntry, readTextFile, readDir } from '@tauri-apps/api/fs';
import { proxyFsExists } from '../../renderer/util';
import yaml from 'yaml';

import { Definition } from '../../common/config/common';

const localeSensitiveFields = ['description', 'text', 'tooltip'];
const localeRegExp = new RegExp('^\\s*{{(.*)}}\\s*$');

export class Extension {
  name: string;

  version: string;

  type: string;

  folder: string;

  ui: object[];

  definition: Definition;

  config: unknown;

  constructor(
    name: string,
    version: string,
    type: string,
    folder: string,
    def: Definition
  ) {
    this.name = name;
    this.version = version;
    this.type = type;
    this.folder = folder;
    this.ui = [];
    this.definition = def;
    this.config = {};
  }

  async readUISpec(): Promise<void> {
    if (await proxyFsExists(`${this.folder}/ui.yml`)) {
      this.ui = yaml.parse(
        await readTextFile(`${this.folder}/ui.yml`)
      );
    }
  }

  async readConfig(): Promise<void> {
    if (await proxyFsExists(`${this.folder}/config.yml`)) {
      this.config = yaml.parse(
        await readTextFile(`${this.folder}/config.yml`)
      );
    }
  }

  async setLocale(language: string): Promise<void> {
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

    if (await proxyFsExists(`${this.folder}/locale`)) {
      if (await proxyFsExists(`${this.folder}/locale/${language}.json`)) {
        const locale = JSON.parse(
          await readTextFile(`${this.folder}/locale/${language}.json`)
        );

        this.ui.forEach((uiElement) => {
          changeLocale(locale, uiElement as { [key: string]: unknown });
        });
      }
    }
  }
}

const Discovery = {
  Extension,
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

        const ext = new Extension(name, version, type, folder, def);
        await ext.readUISpec();
        await ext.setLocale(currentLocale);
        await ext.readConfig();

        return ext;
      })
    );
  },
};

export { Discovery };
