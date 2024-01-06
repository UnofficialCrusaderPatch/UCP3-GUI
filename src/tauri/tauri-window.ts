// for creating an managing new windows
// currently it will just take care that only one window per path can be created
// the main (landing) window is ignored)

// import { TauriEvent } from '@tauri-apps/api/event';
import {
  appWindow,
  WebviewWindow,
  WindowOptions,
} from '@tauri-apps/api/window';
import { getHexHashOfString } from '../util/scripts/hash';

export function getCurrentWindow() {
  return appWindow;
}

export async function getWindowIfExists(
  windowName: string,
  isHash = false,
): Promise<null | WebviewWindow> {
  const hashedWindowName = isHash
    ? windowName
    : await getHexHashOfString(windowName);

  // currently uses internal value found in code to not create a backend window
  // after that, a simple visibility status function of the window is called to check for error
  // TODO: replace with proper function once something working is available
  try {
    const window = new WebviewWindow(hashedWindowName, {
      skip: true,
    } as WindowOptions);
    await window.isVisible();
    return window;
  } catch (error) {
    return null;
  }
}

// I do not like this solution one bit -TheRedDaemon
// normally one would have to listen to the create event, but this event returns
// a listener, not a result, so waiting for it is even harder
// maybe there is a solution with callbacks...
export async function createNewWindow(
  windowName: string,
  options: WindowOptions,
  errorIfExists = false,
): Promise<void> {
  const hashOfNewWindow = await getHexHashOfString(windowName);
  const windowForThisPath = await getWindowIfExists(hashOfNewWindow, true);
  if (windowForThisPath) {
    if (errorIfExists) {
      throw new Error(`Window with name '${windowName}' already exits!`);
    }
    // allows to set focus
    if (options.focus) {
      await windowForThisPath.unminimize(); // does not properly return to maximize, no idea if my fault or bug
      await windowForThisPath.setFocus();
    }
    return;
  }
  // eslint-disable-next-line no-new
  new WebviewWindow(hashOfNewWindow, options);

  // do not forget that ".onCloseRequested" is broken if used multiple times
  // use await "webview.listen(TauriEvent.WINDOW_CLOSE_REQUESTED,..." instead
}
