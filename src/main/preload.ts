import { contextBridge, ipcRenderer, IpcRendererEvent, dialog } from 'electron';
import fs from 'fs';
import StreamZip from 'node-stream-zip';
import yaml from 'yaml';
import { Extension, Discovery } from './framework/discovery';
import { getLatestUCP3Artifacts } from './versions/github';

export type Channels = 'ipc-example';

const baseFolder = `${process.env.APPDATA}/UnofficialCrusaderPatch3/`;
if (!fs.existsSync(baseFolder)) {
  fs.mkdirSync(baseFolder);
}

const extensionsCache: { [key: string]: Extension[] } = {};
const uiCache: { [key: string]: { flat: object[]; hierarchical: object } } = {};

process.once('loaded', () => {
  window.addEventListener('message', (evt) => {
    if (evt.data.type === 'select-dirs') {
      ipcRenderer.send('select-dirs');
    }
  });
});

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    sendMessage(channel: Channels, args: unknown[]) {
      ipcRenderer.send(channel, args);
    },
    on(channel: Channels, func: (...args: unknown[]) => void) {
      const subscription = (_event: IpcRendererEvent, ...args: unknown[]) =>
        func(...args);
      ipcRenderer.on(channel, subscription);

      return () => ipcRenderer.removeListener(channel, subscription);
    },
    once(channel: Channels, func: (...args: unknown[]) => void) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
  ucpBackEnd: {
    // Functions that enable the front end to ask something of the back end.

    // Once the main window boots, it starts up a second window which launches the most recent game folder. It needs to know the most recent game folder.
    getRecentGameFolders() {
      const fname = `${baseFolder}recent.json`;
      if (fs.existsSync(fname)) {
        const recentjson = JSON.parse(
          fs.readFileSync(fname, { encoding: 'utf-8' })
        );
        for (let i = 0; i < recentjson.length; i += 1) {
          recentjson[i].index = i;
        }
        // var mostRecent = recentjson.sort((a: { folder: string, date: number; }, b: { folder: string, date: number; }) => b.date - a.date);
        return recentjson;
      }
      fs.writeFileSync(fname, JSON.stringify([]));

      return [];
    },

    // Allow browsing to a game folder
    async browseGameFolder() {
      const result = await ipcRenderer.invoke('select-dirs');
      const browseresult = document.getElementById(
        'browseresult'
      ) as HTMLInputElement;

      if (browseresult !== null) {
        if (result.filePaths.length > 0) {
          const [target] = result.filePaths;
          browseresult.value = target;
        }
      }
    },

    getGameFolderPath() {
      return ipcRenderer.sendSync('get-game-folder-path');
    },

    // create an editor window for a game folder
    initializeMenuWindow(gameFolder: string) {
      ipcRenderer.invoke('launch-window', gameFolder);
    },

    // Install or deinstalls UCP from these folders.
    installUCPToGameFolder(gameFolder: number) {},
    uninstallUCPFromGameFolder(gameFolder: number) {},

    // Install extension
    installExtension(extensionNameIncludingVersion: string) {},
    uninstallExtension(extensionNameIncludingVersion: string) {},

    // An installed extension will involve settings to be set, which means reloading the window.
    rebuildOptionsWindow() {},

    getUCPVersion(gameFolder: string) {
      const path = `${gameFolder}/ucp-version.yml`;
      if (fs.existsSync(path)) {
        return yaml.parse(fs.readFileSync(path, { encoding: 'utf-8' }));
      }
      return {};
    },

    getExtensions(gameFolder: string) {
      return Discovery.discoverExtensions(gameFolder);
      // Premature optimization is the root of all evil.
      if (extensionsCache[gameFolder] === undefined) {
        extensionsCache[gameFolder] = Discovery.discoverExtensions(gameFolder);
      }
      return extensionsCache[gameFolder];
    },

    // Get yaml definition
    getYamlDefinition(gameFolder: string) {
      if (uiCache[gameFolder] === undefined) {
        if (extensionsCache[gameFolder] === undefined) {
          extensionsCache[gameFolder] =
            Discovery.discoverExtensions(gameFolder);
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

    async getGitHubLatestUCP3Artifacts() {
      const result = await getLatestUCP3Artifacts();
      return result;
    },

    async openFileDialog(filters: { name: string; extensions: string[] }[]) {
      const result = await ipcRenderer.invoke('open-file-dialog', filters);
      if (result === null || result === undefined) {
        window.alert('Opening: Operation cancelled');
        return '';
      }
      return result;
    },

    async installUCPFromZip(zipFilePath: string, gameFolder: string) {
      // eslint-disable-next-line new-cap
      const zip = new StreamZip.async({ file: zipFilePath });

      if (!fs.existsSync(`${gameFolder}/binkw32_real.dll`)) {
        fs.copyFileSync(
          `${gameFolder}/binkw32.dll`,
          `${gameFolder}/binkw32_real.dll`
        );
      }

      const count = await zip.extract(null, gameFolder);
      console.log(`Extracted ${count} entries`);
      await zip.close();
    },

    async loadConfigFromFile() {
      const result = await ipcRenderer.invoke('open-config-file');
      if (result === null || result === undefined) {
        window.alert('Opening: Operation cancelled');
        return {};
      }
      const filePath = result;

      const config = yaml.parse(
        fs.readFileSync(filePath, { encoding: 'utf-8' })
      );

      Object.keys(config).forEach((key) => {
        config[key] = config[key].options;
      });

      return config;
    },

    // Load configuration
    loadUCPConfig() {
      return {};
    },

    // Save configuration
    async saveUCPConfig(config: { [key: string]: object }, filePath: string) {
      let finalFilePath = filePath;
      if (filePath === undefined || filePath === '') {
        const result = await ipcRenderer.invoke('select-file');
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

      fs.writeFileSync(finalFilePath, yaml.stringify(finalConfig));
    },
  },
});
