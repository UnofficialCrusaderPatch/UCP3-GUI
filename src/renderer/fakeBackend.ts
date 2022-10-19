// This file fake the backend calls. They become synchronous, though.

import { downloadDir } from '@tauri-apps/api/path';
import {
  BinaryFileContents,
  readTextFile,
  writeTextFile,
  writeBinaryFile,
} from '@tauri-apps/api/fs';
import {
  open as dialogOpen,
  save as dialogSave,
  ask as dialogAsk,
} from '@tauri-apps/api/dialog';
import { getName, getVersion } from '@tauri-apps/api/app';

import yaml from 'yaml';

import { fetch, ResponseType } from '@tauri-apps/api/http';

import axios from 'axios';

import semver from 'semver';
import { dialog } from '@tauri-apps/api';
import { UCP3_REPOS_MACHINE_TOKEN } from '../main/versions/github';
import {
  Extension,
  OptionEntry,
  SectionDescription,
} from '../common/config/common';
import { UIDefinition } from './GlobalState';
import { Discovery } from '../main/framework/discovery';
import { proxyFsExists } from './utils/file-utils';
import { createNewWindow } from './utils/window-utils';

const extensionsCache: { [key: string]: Extension[] } = {};
const uiCache: { [key: string]: { flat: object[]; hierarchical: object } } = {};

// eslint-disable-next-line import/prefer-default-export
export const ucpBackEnd = {
  // create an editor window for a game folder
  async createEditorWindow(gameFolder: string, language: string | undefined) {
    const langParam = language ? `&lang=${language}` : '';
    await createNewWindow(gameFolder, {
      url: `index.html?window=editor&directory=${gameFolder}${langParam}`,
      width: 1024,
      height: 768,
      maximized: true,
      title: `${await getName()} - ${await getVersion()}`,
      focus: true,
    });
  },

  async checkForGUIUpdates(setGuiUpdateStatus: (newText: string) => void) {
    setGuiUpdateStatus('Contacting GitHub...');
    const res: {
      data: {
        assets: {
          browser_download_url: any;
          name: string;
          url: string;
          id: string;
        }[];
      };
    } = await axios.get(
      `https://api.github.com/repos/UnofficialCrusaderPatch/UCP3-GUI/releases/tags/latest-tauri`,
      {
        auth: { username: 'ucp3-machine', password: UCP3_REPOS_MACHINE_TOKEN },
      }
    );

    const latestJSONAsset = res.data.assets.filter(
      (asset) => asset.name === 'latest.json'
    )[0];

    setGuiUpdateStatus('Fetching latest version info...');
    const latestJSON: {
      version: string;
      pub_date: string;
      notes: string;
      platforms: {
        'windows-x86_64': {
          url: string;
          signature: string;
        };
      };
    } = (
      await fetch(latestJSONAsset.url, {
        method: 'GET',
        responseType: ResponseType.JSON,
        headers: {
          Accept: 'application/octet-stream',
          Authorization: `Basic ${window.btoa(
            `ucp3-machine:${UCP3_REPOS_MACHINE_TOKEN}`
          )}`,
        },
      })
    ).data as {
      version: string;
      pub_date: string;
      notes: string;
      platforms: {
        'windows-x86_64': {
          url: string;
          signature: string;
        };
      };
    };

    console.log(latestJSON);

    const curVer = await getVersion();
    if (semver.lt(curVer, latestJSON.version)) {
      const dialogResult = await dialogAsk(
        `Do you want to download the latest GUI version?\n\n${latestJSON.version}`,
        { title: 'Confirm', type: 'info' }
      );

      if (dialogResult === true) {
        const downloadPath = `${await downloadDir()}UCP3-GUI-${
          latestJSON.version
        }.exe`;
        const guiExeAsset = res.data.assets.filter(
          (asset) => asset.name === 'UCP3-GUI.exe'
        )[0];

        setGuiUpdateStatus('Downloading newer version...');
        const response = await fetch(guiExeAsset.url, {
          method: 'GET',
          responseType: ResponseType.Binary, // important, because we are downloading inside a browser
          headers: {
            Accept: 'application/octet-stream',
            Authorization: `Basic ${window.btoa(
              `ucp3-machine:${UCP3_REPOS_MACHINE_TOKEN}`
            )}`,
          },
        });

        if (response.ok) {
          setGuiUpdateStatus('Writing file...');
          await writeBinaryFile(
            downloadPath,
            response.data as BinaryFileContents
          );
        } else {
          setGuiUpdateStatus('Failed...');
          window.alert('Failed to download GUI update.');
          return;
        }

        setGuiUpdateStatus(`New version downloaded to: ${downloadPath}`);
        console.log(downloadPath);

        // await dialog.message('New GUI version downloaded', { title: `New GUI exe downloaded to: ${downloadPath}`, type: 'info'});
      } else {
        setGuiUpdateStatus('');
      }
    } else {
      await dialog.message('GUI is up to date', {
        title: 'Up to date!',
        type: 'info',
      });
    }
  },

  // Install or deinstalls UCP from these folders.
  installUCPToGameFolder(gameFolder: number) {},
  uninstallUCPFromGameFolder(gameFolder: number) {},

  // Install extension
  installExtension(extensionNameIncludingVersion: string) {},
  uninstallExtension(extensionNameIncludingVersion: string) {},

  // An installed extension will involve settings to be set, which means reloading the window.
  rebuildOptionsWindow() {},

  reloadWindow() {
    window.location.reload();
  },

  async getUCPVersion(gameFolder: string) {
    const path = `${gameFolder}/ucp-version.yml`;
    if (await proxyFsExists(path)) {
      return yaml.parse(await readTextFile(path));
    }
    return {};
  },

  async getExtensions(gameFolder: string) {
    return Discovery.discoverExtensions(gameFolder);
    // Premature optimization is the root of all evil.
    if (extensionsCache[gameFolder] === undefined) {
      extensionsCache[gameFolder] = await Discovery.discoverExtensions(
        gameFolder
      );
    }
    return extensionsCache[gameFolder];
  },

  optionEntriesToHierarchical(uiCollection: OptionEntry[]): SectionDescription {
    const result = { elements: [], sections: {} };

    uiCollection.forEach((ui) => {
      if (ui.category !== undefined) {
        let e: { elements: object[]; sections: { [key: string]: object } } =
          result;
        ui.category.forEach((cat: string) => {
          if (e.sections[cat] === undefined) {
            e.sections[cat] = { elements: [], sections: {} };
          }
          e = e.sections[cat] as {
            elements: object[];
            sections: { [key: string]: object };
          };
        });
        const f = e;
        f.elements.push(ui);
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

  // Get yaml definition
  async getYamlDefinition(gameFolder: string): Promise<UIDefinition> {
    if (uiCache[gameFolder] === undefined) {
      if (extensionsCache[gameFolder] === undefined) {
        extensionsCache[gameFolder] = await Discovery.discoverExtensions(
          gameFolder
        );
      }
      const exts = extensionsCache[gameFolder];
      const uiCollection = this.extensionsToOptionEntries(exts);
      const result = this.optionEntriesToHierarchical(uiCollection);

      uiCache[gameFolder] = { flat: uiCollection, hierarchical: result };
    }
    return uiCache[gameFolder] as UIDefinition; // this could be prettier with the type checking
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
    } = yaml.parse(await readTextFile(filePath as string)); // will only be one

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

  // Load configuration
  loadUCPConfig() {
    return {};
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

        const ext = extensionsCache[Object.keys(extensionsCache)[0]].filter(
          (ex) => ex.name === extName
        )[0];

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
