import { getAppName, getAppVersion } from 'tauri/tauri-misc';
import { createNewWindow } from 'tauri/tauri-window';

export function reloadCurrentWindow() {
  window.location.reload();
}

export async function createEditorWindow(gameFolder: string) {
  const appName = (await getAppName()).getOrElse('APP');
  const appVersion = (await getAppVersion()).getOrElse('UNKNOWN');

  await createNewWindow(gameFolder, {
    url: `index.html?window=editor&directory=${gameFolder}`,
    width: 1024,
    maximized: true,
    title: `${appName} - ${appVersion}`,
    focus: true,

    // +30 height and no decorations for titlebar
    height: 768 + 30,
    decorations: false,
  });
}
