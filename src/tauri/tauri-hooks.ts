// used to globally store hooks tauri hooks

import { appWindow } from '@tauri-apps/api/window';
import { showError } from './tauri-dialog';

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
