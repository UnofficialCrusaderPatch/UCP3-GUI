// This file fake the backend calls. They become synchronous, though.

import { dataDir, resolve } from '@tauri-apps/api/path';
import * as fs from '@tauri-apps/api/fs';
import * as dialog from '@tauri-apps/api/dialog';
import { WebviewWindow } from '@tauri-apps/api/window'

import yaml from 'yaml';

import { Extension, Discovery } from '../main/framework/discovery';
import { UIDefinition } from './GlobalState';

import {
  checkForLatestUCP3DevReleaseUpdate,
  UCP3_REPOS_MACHINE_TOKEN,
} from '../main/versions/github';

import { fetch, ResponseType } from '@tauri-apps/api/http';

import JSZip from 'jszip';

const baseFolder = `${await dataDir()}/UnofficialCrusaderPatch3/`;
if (!(await fs.exists(baseFolder))) { // apparently a bug of the typing, actually returns boolean
  fs.createDir(baseFolder);
}

const extensionsCache: { [key: string]: Extension[] } = {};
const uiCache: { [key: string]: { flat: object[]; hierarchical: object } } = {};

export const ucpBackEnd = {

  // Once the main window boots, it starts up a second window which launches the most recent game folder. It needs to know the most recent game folder.
  async getRecentGameFolders() {
    const fname = `${baseFolder}recent.json`;
    if (await fs.exists(fname)) {
      const recentjson = JSON.parse(
        await fs.readTextFile(fname)
      );
      for (let i = 0; i < recentjson.length; i += 1) {
        recentjson[i].index = i;
      }
      // var mostRecent = recentjson.sort((a: { folder: string, date: number; }, b: { folder: string, date: number; }) => b.date - a.date);
      return recentjson;
    }
    await fs.writeTextFile(fname, JSON.stringify([]));

    return [];
  },

  getGameFolderPath(urlParams: URLSearchParams) {
    return urlParams.get("directory") || "";
  },

  // create an editor window for a game folder
  createEditorWindow(gameFolder: string) {
    // only one editor currently possible
    const webview = new WebviewWindow('editor', {
      url: `index.html?window=editor&directory=${gameFolder}`,
      width: 1024,
      height: 768,
      maximized: true
    });
  },

  async checkForUCP3Updates(gameFolder: string) {
    const { sha } = await fs.exists(`${gameFolder}/ucp-version.yml`)
      ? yaml.parse(
          await fs.readTextFile(`${gameFolder}/ucp-version.yml`)
        )
      : { sha: '!' };
    const result = await checkForLatestUCP3DevReleaseUpdate(sha);

    if (result.update === true) {
      // ask options are fixed in tauri
      const dialogResult = await dialog.ask(
        `Do you want to download the latest UCP3 version?\n\n${result.file}`,
        { title: 'Confirm', type: 'info' }
      );
  
      if (dialogResult !== true) {
        window.alert('cancelled by user');
        return {
          update: false,
          file: "",
          downloaded: false,
          installed: false,
        };
      }

      const downloadPath = `${gameFolder}/${result.file}`;
      const response = await fetch(result.downloadUrl, {
        method: 'GET',
        responseType: ResponseType.Binary, // important, because we are downloading inside a browser
        headers:{
          Accept: 'application/octet-stream',
          Authorization: 'Basic ' + window.btoa('ucp3-machine' + ":" + UCP3_REPOS_MACHINE_TOKEN)
        }
      });

      if (response.ok) {
        await fs.writeBinaryFile(downloadPath, response.data);
      } else {
        window.alert('Failed to download UCP3 update.');
        return {
          update: false,
          file: "",
          downloaded: false,
          installed: false,
        };
      }
      
      console.log(downloadPath);
      const installResult = await this.installUCPFromZip(downloadPath, gameFolder);

      return {
        update: true,
        file: result.file,
        downloaded: resolve(downloadPath),
        installed: installResult,
      };
    }

    return {
      update: false,
      file: result.file,
      downloaded: false,
      installed: false,
    };
  },

  async downloadUCP3Update(update: unknown) {
    const result = await ipcRenderer.invoke('download-ucp3-update', update);
    return result;
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
    if (await fs.exists(path)) {
      return yaml.parse(await fs.readTextFile(path));
    }
    return {};
  },

  async getExtensions(gameFolder: string) {
    return await Discovery.discoverExtensions(gameFolder);
    // Premature optimization is the root of all evil.
    if (extensionsCache[gameFolder] === undefined) {
      extensionsCache[gameFolder] = await Discovery.discoverExtensions(gameFolder);
    }
    return extensionsCache[gameFolder];
  },

  // Get yaml definition
  async getYamlDefinition(gameFolder: string) : Promise<UIDefinition> {
    if (uiCache[gameFolder] === undefined) {
      if (extensionsCache[gameFolder] === undefined) {
        extensionsCache[gameFolder] =
          await Discovery.discoverExtensions(gameFolder);
      }
      const exts = extensionsCache[gameFolder];
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

      uiCache[gameFolder] = { flat: uiCollection, hierarchical: result };
    }
    return uiCache[gameFolder];
  },

  async openFileDialog(gameFolder: string, filters: { name: string; extensions: string[] }[]) {
    const result = await dialog.open({
      directory: false,
      multiple: false,
      defaultPath: gameFolder,
      filters: filters || [{ name: 'All Files', extensions: ['*'] }]
    });

    if (result === null){
      window.alert('Opening: Operation cancelled');
      return '';
    }
    return result;
  },

  async openFolderDialog(gameFolder: string) {
    const result = await dialog.open({
      directory: true,
      multiple: false,
      defaultPath: gameFolder,
    });
    return result !== null ? result : undefined;
  },

  async installUCPFromZip(zipFilePath: string, gameFolder: string) {
    if (!(await fs.exists(`${gameFolder}/binkw32_real.dll`))) {
      if (await fs.exists(`${gameFolder}/binkw32.dll`)) {
        await fs.copyFile(
          `${gameFolder}/binkw32.dll`,
          `${gameFolder}/binkw32_real.dll`
        );
      } else {
        // TODO: appropriate warning
        console.warn(
          `binkw32.dll does not exist in this directory, are we in a game directory?`
        );
      }
    }

    const data = await fs.readBinaryFile(zipFilePath);
    const zip = await JSZip.loadAsync(data);

    const listOfDir: Array<JSZip.JSZipObject> = []
    const listOfFiles: Array<JSZip.JSZipObject> = []
    zip. forEach((relativePath: string, file: JSZip.JSZipObject) => {
      (file.dir ? listOfDir : listOfFiles).push(file);
    });
    await Promise.all(listOfDir.map((dir) => fs.createDir(`${gameFolder}/${dir.name}`, {recursive: true})));
    await Promise.all(listOfFiles.map(async (file) => {
      const data = await file.async("uint8array");
      await fs.writeBinaryFile(`${gameFolder}/${file.name}`, data);
    }));
    console.log(`Extracted ${listOfFiles.length} entries`);

    await fs.copyFile(`${gameFolder}/binkw32_ucp.dll`, `${gameFolder}/binkw32.dll`);

    return true;
  },

  async loadConfigFromFile(gameFolder: string) {
    const result = await dialog.open({
      directory: false,
      multiple: false,
      defaultPath: gameFolder,
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: 'Config files', extensions: ['yml', 'yaml'] },
      ]
    });

    if (result === null){
      window.alert('Opening: Operation cancelled');
      return undefined;
    }
    const filePath = result;

    const config: {
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
    } = yaml.parse(await fs.readTextFile(filePath));

    const finalConfig: { [key: string]: unknown } = {};

    Object.entries(config.modules || {}).forEach(([key, value]) => {
      finalConfig[key] = value.options;
    });

    Object.entries(config.plugins || {}).forEach(([key, value]) => {
      finalConfig[key] = value.options;
    });

    return finalConfig;
  },

  // Load configuration
  loadUCPConfig() {
    return {};
  },

  // Save configuration
  async saveUCPConfig(config: { [key: string]: object }, filePath: string) {
    let finalFilePath = filePath;
    if (filePath === undefined || filePath === '') {
      const result = await dialog.save({
        filters: [{ name: 'All Files', extensions: ['*'] }]
      });
      if (result === null || result === undefined) {
        window.alert('Saving: Operation cancelled');
        return;
      }
      finalFilePath = result;
    }

    const finalConfig: {
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
    } = { modules: {}, plugins: {} };
    Object.entries(config)
      .filter(([key, value]) => value !== undefined)
      .forEach(([key, value]) => {
        const parts = key.split('.');
        const extName = parts[0];

        const ext = extensionsCache[Object.keys(extensionsCache)[0]].filter(
          (ex) => {
            return ex.name === extName;
          }
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

    await fs.writeTextFile(finalFilePath, yaml.stringify(finalConfig));
  }
};