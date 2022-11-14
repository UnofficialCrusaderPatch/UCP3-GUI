// for creating an managing new windows
// currently it will just take care that only of window can be crated
// the main (landing) window is ignored)

import { TauriEvent } from '@tauri-apps/api/event';
import { WebviewWindow, WindowOptions } from '@tauri-apps/api/window';
import { getHexHashOfString } from 'util/scripts/hash';

const createdWindows: { [key: string]: WebviewWindow } = {};

export function getWindowIfExists(
  windowName: string
): undefined | WebviewWindow {
  return createdWindows[windowName];
}

// I do not like this solution one bit -TheRedDaemon
// normally one would have to listen to the create event, but this event returns
// a listener, not a result, so waiting for it is even harder
// maybe there is a solution with callbacks...
export async function createNewWindow(
  windowName: string,
  options: WindowOptions,
  errorIfExists = false
): Promise<void> {
  // if it exits, the options are ignored and the window is given focus
  // eslint-disable-next-line no-prototype-builtins
  if (createdWindows.hasOwnProperty(windowName)) {
    if (errorIfExists) {
      throw new Error(`Window with name '${windowName}' already exits!`);
    }
    // allows to set focus
    if (options.focus) {
      await createdWindows[windowName].setFocus();
    }
    return;
  }

  // uses a hash
  const webview = new WebviewWindow(
    await getHexHashOfString(windowName),
    options
  );

  // also expects close to go through
  const unlistenFunc = await webview.listen(
    TauriEvent.WINDOW_CLOSE_REQUESTED,
    () => {
      delete createdWindows[windowName];
      unlistenFunc();
    }
  );
  createdWindows[windowName] = webview;
}
