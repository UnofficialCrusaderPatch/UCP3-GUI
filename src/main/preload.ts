import { contextBridge, ipcRenderer, IpcRendererEvent, dialog } from 'electron';
import fs from 'fs';
import yaml from 'yaml';
import { Extension, Discovery } from './framework/discovery';

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

    getGameFolderPath() {
      return ipcRenderer.sendSync('get-game-folder-path');
    },

    // create an editor window for a game folder
    createEditorWindow(gameFolder: string) {
      ipcRenderer.invoke('launch-editor', gameFolder);
    },

    async checkForUCP3Updates() {
      const result = await ipcRenderer.invoke('check-ucp3-updates');

      if (result.update === true) {
        const downloadResult = await ipcRenderer.invoke(
          'download-ucp3-update',
          result
        );
        console.log(downloadResult);
        const installResult = await ipcRenderer.invoke(
          'install-ucp3-from-zip',
          downloadResult
        );

        return {
          update: true,
          file: result.file,
          downloaded: downloadResult,
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
      ipcRenderer.invoke('reload-window');
    },

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

    async openFileDialog(filters: { name: string; extensions: string[] }[]) {
      const result = await ipcRenderer.invoke('open-file-dialog', filters);
      if (result === null || result === undefined) {
        window.alert('Opening: Operation cancelled');
        return '';
      }
      return result;
    },

    async openFolderDialog() {
      const result = await ipcRenderer.invoke('open-folder-dialog');
      return result;
    },

    async installUCPFromZip(zipFilePath: string) {
      const result = await ipcRenderer.invoke(
        'install-ucp3-from-zip',
        zipFilePath
      );
      return result;
    },

    async loadConfigFromFile() {
      const result = await ipcRenderer.invoke('open-file-dialog', [
        { name: 'All Files', extensions: ['*'] },
        { name: 'Config files', extensions: ['yml', 'yaml'] },
      ]);
      if (result === null || result === undefined) {
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
      } = yaml.parse(fs.readFileSync(filePath, { encoding: 'utf-8' }));

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
        const result = await ipcRenderer.invoke('save-file-dialog');
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
