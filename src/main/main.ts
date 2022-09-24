/* eslint global-require: off, no-console: off, promise/always-return: off */

/**
 * This module executes inside of electron's main process. You can start
 * electron renderer process from here and communicate with the other processes
 * through IPC.
 *
 * When running `npm run build` or `npm run build:main`, this file is compiled to
 * `./src/main.js` using webpack. This gives us some performance wins.
 */
import path from 'path';
import {
  app,
  BrowserWindow,
  shell,
  ipcMain,
  dialog,
  WebContents,
} from 'electron';
import { autoUpdater } from 'electron-updater';
import log from 'electron-log';
import MenuBuilder from './menu';
import { resolveHtmlPath } from './util';

export default class AppUpdater {
  constructor() {
    log.transports.file.level = 'info';
    autoUpdater.logger = log;
    autoUpdater.checkForUpdatesAndNotify();
  }
}

let mainWindow: BrowserWindow | null = null;

ipcMain.on('ipc-example', async (event, arg) => {
  const msgTemplate = (pingPong: string) => `IPC test: ${pingPong}`;
  console.log(msgTemplate(arg));
  event.reply('ipc-example', msgTemplate('pong'));
});

if (process.env.NODE_ENV === 'production') {
  const sourceMapSupport = require('source-map-support');
  sourceMapSupport.install();
}

const isDebug =
  process.env.NODE_ENV === 'development' || process.env.DEBUG_PROD === 'true';

if (isDebug) {
  require('electron-debug')();
}

const installExtensions = async () => {
  const installer = require('electron-devtools-installer');
  const forceDownload = !!process.env.UPGRADE_EXTENSIONS;
  const extensions = ['REACT_DEVELOPER_TOOLS'];

  return installer
    .default(
      extensions.map((name) => installer[name]),
      forceDownload
    )
    .catch(console.log);
};

const windows = new Set();

const createWindow = async (options: {
  url: string;
  width: number;
  height: number;
  maximize: boolean;
}) => {
  if (isDebug) {
    await installExtensions();
  }

  const RESOURCES_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'assets')
    : path.join(__dirname, '../../assets');

  const getAssetPath = (...paths: string[]): string => {
    return path.join(RESOURCES_PATH, ...paths);
  };

  const { url, width, height, maximize } = options;

  const window = new BrowserWindow({
    show: false,
    width,
    height,
    icon: getAssetPath('icon.png'),
    webPreferences: {
      preload: app.isPackaged
        ? path.join(__dirname, 'preload.js')
        : path.join(__dirname, '../../.erb/dll/preload.js'),
    },
  });

  windows.add(window);

  window.loadURL(url);

  window.on('ready-to-show', () => {
    if (!window) {
      throw new Error('"mainWindow" is not defined');
    }

    if (maximize) {
      window.maximize();
    } else {
      window.show();
    }
  });

  window.on('closed', () => {
    windows.delete(window);
  });

  const menuBuilder = new MenuBuilder(window);
  menuBuilder.buildMenu();

  // Open urls in the user's browser
  window.webContents.setWindowOpenHandler((edata) => {
    shell.openExternal(edata.url);
    return { action: 'deny' };
  });

  // Remove this if your app does not use auto updates
  // eslint-disable-next-line
  new AppUpdater();

  return window;
};

/**
 * Add event listeners...
 */

ipcMain.handle('select-dirs', async (event, arg) => {
  if (mainWindow !== null) {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openDirectory'],
    });
    return result;
  }
  return null;
});

ipcMain.handle('select-file', async (event, arg) => {
  if (mainWindow !== null) {
    const result = await dialog.showSaveDialog(mainWindow);
    if (result.canceled) return undefined;
    return result.filePath;
  }
  return undefined;
});

interface Sender extends Electron.WebContents {
  getOwnerBrowserWindow(): Electron.BrowserWindow;
}

ipcMain.handle('open-file-dialog', async (event, filters) => {
  if (mainWindow !== null) {
    const result = await dialog.showOpenDialog(
      (event.sender as Sender).getOwnerBrowserWindow(),
      {
        properties: ['openFile'],
        filters: filters || [{ name: 'All Files', extensions: ['*'] }],
      }
    );
    if (result.canceled) return undefined;
    return result.filePaths[0];
  }
  return undefined;
});

ipcMain.handle('open-config-file', async (event, arg) => {
  if (mainWindow !== null) {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'All Files', extensions: ['*'] },
        { name: 'Config files', extensions: ['yml', 'yaml'] },
      ],
    });
    if (result.canceled) return undefined;
    return result.filePaths[0];
  }
  return undefined;
});

const windowFolderMapping: { [key: number]: string } = {};

ipcMain.on('get-game-folder-path', (event) => {
  event.returnValue =
    windowFolderMapping[(event.sender as Sender).getOwnerBrowserWindow().id];
});

ipcMain.handle('launch-window', async (event, arg) => {
  // TODO: make this appropriate for a real multi window scheme.
  const currentFolder = arg;

  // Alternative: https://stackoverflow.com/a/68551332
  const window = await createWindow({
    url: resolveHtmlPath(`index.html?window=editor&directory=${currentFolder}`),
    width: 1024,
    height: 768,
    maximize: true,
  });

  windowFolderMapping[window.id] = currentFolder;

  // console.log(window.id);
});

// Alternative to URL based game folder logic
// ipcMain.handle('get-current-folder', async (event, arg) => {
//   console.log(arg);
//   console.log(event.sender.getOwnerBrowserWindow());
//   console.log(event.processId);
// });

app.on('window-all-closed', () => {
  // Respect the OSX convention of having the application in memory even
  // after all windows have been closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app
  .whenReady()
  .then(async () => {
    mainWindow = await createWindow({
      url: resolveHtmlPath('index.html?window=landing'),
      width: 1024,
      height: 768,
      maximize: false,
    });
    app.on('activate', async () => {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (mainWindow === null)
        mainWindow = await createWindow({
          url: resolveHtmlPath('index.html?window=landing'),
          width: 1024,
          height: 768,
          maximize: false,
        });
    });
  })
  .catch(console.log);
