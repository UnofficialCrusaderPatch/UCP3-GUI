// This file fake the backend calls. They become synchronous, though.

import { writeTextFile, loadYaml } from 'tauri/tauri-files';
import { open as dialogOpen } from 'tauri/tauri-dialog';

import yaml from 'yaml';

import {
  DisplayConfigElement,
  Extension,
  OptionEntry,
  SectionDescription,
} from 'config/ucp/common';
import { Discovery } from './extensions/discovery';

const extensionsCache: { [key: string]: Extension[] } = {};

// eslint-disable-next-line import/prefer-default-export
export const ucpBackEnd = {
  async getExtensions(gameFolder: string, locale?: string) {
    return Discovery.discoverExtensions(gameFolder, locale);
    // Premature optimization is the root of all evil.
    if (extensionsCache[gameFolder] === undefined) {
      extensionsCache[gameFolder] = await Discovery.discoverExtensions(
        gameFolder
      );
    }
    return extensionsCache[gameFolder];
  },

  optionEntriesToHierarchical(uiCollection: OptionEntry[]): SectionDescription {
    const result: {
      elements: DisplayConfigElement[];
      sections: { [key: string]: SectionDescription };
    } = { elements: [], sections: {} };

    uiCollection.forEach((ui) => {
      if (ui.category !== undefined) {
        let e: {
          elements: DisplayConfigElement[];
          sections: { [key: string]: SectionDescription };
        } = result;
        ui.category.forEach((cat: string) => {
          if (e.sections[cat] === undefined) {
            e.sections[cat] = { elements: [], sections: {} };
          }
          e = e.sections[cat] as {
            elements: DisplayConfigElement[];
            sections: { [key: string]: SectionDescription };
          };
        });
        const f = e;
        f.elements.push(ui as unknown as DisplayConfigElement);
      } else {
        result.elements.push(ui as unknown as DisplayConfigElement);
      }
    });

    return result;
  },

  extensionsToOptionEntries(exts: Extension[]) {
    const uiCollection: any[] = [];
    exts.forEach((ext) => {
      uiCollection.push(...ext.ui);
    });
    uiCollection.sort((a, b) => {
      if (a.category === undefined || b.category === undefined) return 0;
      for (
        let i = 0;
        i < Math.min(a.category.length, b.category.length);
        i += 1
      ) {
        const comp = a.category[i].localeCompare(b.category[i]);
        if (comp !== 0) {
          if (a.category[i] === 'Advanced') return 1;
          if (b.category[i] === 'Advanced') return -1;
          return comp;
        }
      }
      return 0;
    });
    return uiCollection;
  },

  async openFileDialog(
    gameFolder: string,
    filters: { name: string; extensions: string[] }[]
  ) {
    const result = await dialogOpen({
      directory: false,
      multiple: false,
      defaultPath: gameFolder,
      filters: filters || [{ name: 'All Files', extensions: ['*'] }],
    });

    if (result === null) {
      window.alert('Opening: Operation cancelled');
      return '';
    }
    return result as string;
  },

  async openFolderDialog(gameFolder: string): Promise<string | undefined> {
    const result = await dialogOpen({
      directory: true,
      multiple: false,
      defaultPath: gameFolder,
    });
    return result !== null ? (result as string) : undefined;
  },

  async loadConfigFromFile(filePath: string) {
    const config: {
      order: string[];
      modules: {
        [key: string]: {
          active: boolean;
          version: string;
          options: { [key: string]: unknown };
        };
      };
      plugins: {
        [key: string]: {
          active: boolean;
          version: string;
          options: { [key: string]: unknown };
        };
      };
    } = (await loadYaml(filePath as string)).getOrThrow(); // will only be one

    if (config.modules === undefined && config.plugins === undefined) {
      return {
        status: 'FAIL',
        message: 'Not a valid config file',
      };
    }

    const finalConfig: { [key: string]: unknown } = {};

    Object.entries(config.modules || {}).forEach(([key, value]) => {
      finalConfig[key] = value.options;
    });

    Object.entries(config.plugins || {}).forEach(([key, value]) => {
      finalConfig[key] = value.options;
    });

    return {
      status: 'OK',
      message: '',
      result: {
        config: finalConfig,
        order: config.order || [],
      },
    };
  },

  // Save configuration
  async saveUCPConfig(
    config: { [key: string]: unknown },
    filePath: string,
    extensions: Extension[]
  ) {
    const finalConfig: {
      order: string[];
      modules: {
        [key: string]: {
          active: boolean;
          version: string;
          options: { [key: string]: unknown };
        };
      };
      plugins: {
        [key: string]: {
          active: boolean;
          version: string;
          options: { [key: string]: unknown };
        };
      };
    } = { modules: {}, plugins: {}, order: [] };
    finalConfig.order = extensions.map(
      (e: Extension) => `${e.name} == ${e.version}`
    );
    Object.entries(config)
      .filter(([key, value]) => value !== undefined)
      .forEach(([key, value]) => {
        const parts = key.split('.');
        const extName = parts[0];

        const ext = extensions.filter((ex) => ex.name === extName)[0];

        const type = ext.type === 'module' ? 'modules' : 'plugins';

        if (finalConfig[type][extName] === undefined) {
          finalConfig[type][extName] = {
            version: ext.version,
            options: {},
            active: true,
          };
        }

        const configParts = parts.slice(1);
        const partsdrop1 = configParts.slice(0, -1);
        const finalpart = configParts.slice(-1)[0];
        let fcp = finalConfig[type][extName].options;
        partsdrop1.forEach((part: string) => {
          if (fcp[part] === undefined) {
            fcp[part] = {};
          }
          fcp = fcp[part] as { [key: string]: unknown };
        });
        fcp[finalpart] = value;
      });

    extensions.forEach((e: Extension) => {
      if (e.type === 'module') {
        if (finalConfig.modules[e.name] === undefined) {
          finalConfig.modules[e.name] = {
            version: e.version,
            options: {},
            active: true,
          };
        }
      }
      if (e.type === 'plugin') {
        if (finalConfig.plugins[e.name] === undefined) {
          finalConfig.plugins[e.name] = {
            version: e.version,
            options: {},
            active: true,
          };
        }
      }
    });

    await writeTextFile(filePath, yaml.stringify(finalConfig));
  },
};
