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
const uiCache: { [key: string]: unknown[] } = {};
const uiCache2: { [key: string]: unknown } = {};

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
      console.log('click!');
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
            if (comp !== 0) return comp;
          }
          return 0;
        });

        const result: { [key: string]: unknown } = {};
        uiCollection.forEach((ui) => {
          if (ui.category !== undefined) {
            let e: { [key: string]: unknown } = result;
            ui.category.forEach((cat: string) => {
              if (e[cat] === undefined) {
                e[cat] = {};
              }
              e = e[cat] as { [key: string]: unknown };
            });
            const f = e as { elements: object[] };
            if (f.elements === undefined) {
              f.elements = [];
            }
            f.elements.push(ui);
          }
        });

        console.log('caching: ', gameFolder, result);
        uiCache[gameFolder] = uiCollection;
        uiCache2[gameFolder] = result;
      }
      console.log('refreshing: ', gameFolder, uiCache[gameFolder]);
      // return uiCache2[gameFolder];
      return uiCache[gameFolder];
      return yaml.parse(
        fs.readFileSync(`${gameFolder}\\ucp3-gui-poc.yml`, {
          encoding: 'utf-8',
        })
      );
    },

    // Load configuration
    loadUCPConfig() {
      return {};
    },

    // Save configuration
    saveUCPConfig(config: { [key: string]: object }, filePath: string) {
      const finalConfig: { [key: string]: object } = {};
      Object.keys(config).forEach((key: string) => {
        const value = config[key];
        let fcp = finalConfig;
        const parts = key.split('.');
        const partsComplete = [parts[0], 'options', ...parts.slice(1)];
        const partsdrop1 = partsComplete.slice(0, -1);
        const finalpart = partsComplete.slice(-1)[0];
        partsdrop1.forEach((part: string) => {
          if (fcp[part] === undefined) {
            fcp[part] = {};
          }
          fcp = fcp[part] as { [key: string]: object };
        });
        fcp[finalpart] = value;
      });
      fs.writeFileSync(filePath, yaml.stringify(finalConfig));
    },

    getExtensions(gameFolder: string) {
      return Discovery.discoverExtensions(gameFolder);
    },
  },
});
