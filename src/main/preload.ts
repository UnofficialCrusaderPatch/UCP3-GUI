import { contextBridge, ipcRenderer, IpcRendererEvent, dialog } from 'electron';
import fs from 'fs';
import yaml from 'yaml';

export type Channels = 'ipc-example';

const baseFolder = `${process.env.APPDATA}/UnofficialCrusaderPatch3/`;
if (!fs.existsSync(baseFolder)) {
  fs.mkdirSync(baseFolder);
}

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
      // TODO: dummy
      return yaml.parse(
        fs.readFileSync(`${gameFolder}poc.yml`, { encoding: 'utf-8' })
      );
    },

    // Load configuration
    loadUCPConfig() {
      return {};
    },

    // Save configuration
    saveUCPConfig(config: object) {},
  },
});
