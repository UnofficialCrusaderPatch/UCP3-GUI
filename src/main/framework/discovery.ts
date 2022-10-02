import fs from 'fs';
import yaml from 'yaml';

import { Definition, Extension } from '../../common/config/common';

type ExtensionExtra = Extension & { folder: string };

const localeSensitiveFields = ['description', 'text', 'tooltip'];
const localeRegExp = new RegExp('^\\s*{{(.*)}}\\s*$');

function readUISpec(ext: ExtensionExtra): void {
  if (fs.existsSync(`${ext.folder}/ui.yml`)) {
    ext.ui = yaml.parse(
      fs.readFileSync(`${ext.folder}/ui.yml`, { encoding: 'utf-8' })
    );
  } else {
    ext.ui = [];
  }
}

function readConfig(ext: ExtensionExtra): void {
  if (fs.existsSync(`${ext.folder}/config.yml`)) {
    ext.config = yaml.parse(
      fs.readFileSync(`${ext.folder}/config.yml`, { encoding: 'utf-8' })
    );
  } else {
    ext.config = {};
  }
}

function setLocale(ext: ExtensionExtra, language: string): void {
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

  if (fs.existsSync(`${ext.folder}/locale`)) {
    if (fs.existsSync(`${ext.folder}/locale/${language}.json`)) {
      const locale = JSON.parse(
        fs.readFileSync(`${ext.folder}/locale/${language}.json`, {
          encoding: 'utf-8',
        })
      );

      ext.ui.forEach((uiElement) => {
        changeLocale(locale, uiElement as { [key: string]: unknown });
      });
    }
  }
}

const Discovery = {
  discoverExtensions: (gameFolder: string) => {
    const currentLocale = 'English'; // Dummy location for ext code

    const moduleDir = `${gameFolder}/ucp/modules`;
    const modDirEnts = fs.existsSync(moduleDir)
      ? fs.readdirSync(moduleDir, { withFileTypes: true })
      : [];

    const pluginDir = `${gameFolder}/ucp/plugins`;
    const pluginDirEnts = fs.existsSync(pluginDir)
      ? fs.readdirSync(pluginDir, { withFileTypes: true })
      : [];

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

        const definition = yaml.parse(
          fs.readFileSync(`${folder}/definition.yml`, { encoding: 'utf-8' })
        );
        const { name, version } = definition;

        definition.dependencies = definition.depends || [];

        const ext = {
          name,
          version,
          type,
          folder,
          definition,
        } as unknown as ExtensionExtra;
        readUISpec(ext);
        setLocale(ext, currentLocale);
        readConfig(ext);

        return ext;
      });
  },
};

// eslint-disable-next-line import/prefer-default-export
export { Discovery };
