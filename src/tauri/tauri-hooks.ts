// used to globally store hooks tauri hooks

import { TauriEvent } from '@tauri-apps/api/event';
import { appWindow } from '@tauri-apps/api/window';
import { showError } from './tauri-dialog';

// TODO: maybe a class for these register stuff would be useful

// on window close stuff

const onWindowCloseFuncs = new Map<unknown, () => Promise<void>>();

// module await is apparently not supported
const windowCloseUnlistenPromise = appWindow.onCloseRequested(async () => {
  // eslint-disable-next-line no-restricted-syntax
  for (const [, func] of onWindowCloseFuncs) {
    // eslint-disable-next-line no-await-in-loop
    await func();
  }
  (await windowCloseUnlistenPromise)();
});

export function unregisterForWindowClose(key: unknown): boolean {
  return onWindowCloseFuncs.delete(key);
}

export function registerForWindowClose(
  key: unknown,
  func: () => Promise<void>
): boolean {
  if (onWindowCloseFuncs.has(key)) {
    showError(
      `The key ${key} was already used to place a window close function.`
    );
    return false;
  }
  onWindowCloseFuncs.set(key, func);
  return true;
}

// on window resize stuff

const onWindowResizeFuncs = new Map<unknown, () => Promise<void>>();

export function unregisterForWindowResize(key: unknown): boolean {
  return onWindowResizeFuncs.delete(key);
}

export function registerForWindowResize(
  key: unknown,
  func: () => Promise<void>
): boolean {
  if (onWindowResizeFuncs.has(key)) {
    showError(
      `The key ${key} was already used to place a window resize function.`
    );
    return false;
  }
  onWindowResizeFuncs.set(key, func);
  return true;
}

const windowResizeUnlistenPromise = appWindow.listen(
  TauriEvent.WINDOW_RESIZED,
  async () => {
    // eslint-disable-next-line no-restricted-syntax
    for (const [, func] of onWindowResizeFuncs) {
      // eslint-disable-next-line no-await-in-loop
      await func();
    }
  }
);
registerForWindowClose('WINDOW_RESIZE', async () => {
  (await windowResizeUnlistenPromise)();
});
