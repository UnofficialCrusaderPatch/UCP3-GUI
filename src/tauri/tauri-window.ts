// for creating an managing new windows
// currently it will just take care that only one window per path can be created
// the main (landing) window is ignored)

import {
  getAll as getAllWindows,
  WebviewWindow,
  WindowOptions,
} from '@tauri-apps/api/window';
import { getHexHashOfString } from 'util/scripts/hash';

// BROKEN
// does not work between reloads currently
// maybe this will fix it: https://github.com/tauri-apps/tauri/issues/5571
export async function getWindowIfExists(
  windowName: string,
  isHash = false
): Promise<undefined | WebviewWindow> {
  const hashedWindowName = isHash
    ? windowName
    : await getHexHashOfString(windowName);
  return getAllWindows().find((webview) => webview.label === hashedWindowName);
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
  const hashOfNewWindow = await getHexHashOfString(windowName);
  const windowForThisPath = new WebviewWindow(hashOfNewWindow, options); // points to old if same name?
  if (windowForThisPath) {
    // disabled and left as a reminder, maybe they fix the getAll some day
    // if (errorIfExists) {
    //   throw new Error(`Window with name '${windowName}' already exits!`);
    // }
    // allows to set focus
    if (options.focus) {
      await windowForThisPath
        .setFocus()
        .catch(() => console.log(`Can not set focus, window not yet present.`)); // just as a reminder
    }
  }

  // do not forget that ".onCloseRequested" is broken if used multiple times
  // use await "webview.listen(TauriEvent.WINDOW_CLOSE_REQUESTED,..." instead
}
