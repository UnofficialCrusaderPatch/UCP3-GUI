import fs from 'fs';
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

  readUISpec(): void {
    if (fs.existsSync(`${this.folder}/ui.yml`)) {
      this.ui = yaml.parse(
        fs.readFileSync(`${this.folder}/ui.yml`, { encoding: 'utf-8' })
      );
    }
  }

  readConfig(): void {
    if (fs.existsSync(`${this.folder}/config.yml`)) {
      this.config = yaml.parse(
        fs.readFileSync(`${this.folder}/config.yml`, { encoding: 'utf-8' })
      );
    }
  }

  setLocale(language: string): void {
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

    if (fs.existsSync(`${this.folder}/locale`)) {
      if (fs.existsSync(`${this.folder}/locale/${language}.json`)) {
        const locale = JSON.parse(
          fs.readFileSync(`${this.folder}/locale/${language}.json`, {
            encoding: 'utf-8',
          })
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
  discoverExtensions: (gameFolder: string) => {
    const currentLocale = 'English'; // Dummy location for this code

    const moduleDir = `${gameFolder}/ucp/modules`;
    const modDirEnts = fs.readdirSync(moduleDir, { withFileTypes: true });

    const pluginDir = `${gameFolder}/ucp/plugins`;
    const pluginDirEnts = fs.readdirSync(pluginDir, { withFileTypes: true });

    const dirEnts: fs.Dirent[] = [...modDirEnts, ...pluginDirEnts];

    return dirEnts
      .filter((d: fs.Dirent) => {
        return d.isDirectory();
      })
      .map((d: fs.Dirent) => {
        const type = modDirEnts.indexOf(d) === -1 ? 'plugin' : 'module';

        const folder =
          type === 'module'
            ? `${gameFolder}/ucp/modules/${d.name}`
            : `${gameFolder}/ucp/plugins/${d.name}`;

        const def = yaml.parse(
          fs.readFileSync(`${folder}/definition.yml`, { encoding: 'utf-8' })
        );
        const { name, version } = def;

        def.dependencies = def.depends || [];

        const ext = new Extension(name, version, type, folder, def);
        ext.readUISpec();
        ext.setLocale(currentLocale);
        ext.readConfig();

        return ext;
      });
  },
};

export { Discovery };
