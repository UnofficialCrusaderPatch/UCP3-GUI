/* eslint-disable max-classes-per-file */

// gynt: I tried putting this in the test files themselves.
// That did not work as the mock is (somehow) called too late.
import { mockIPC, mockWindows } from '@tauri-apps/api/mocks';

if (process && process.env && process.env.VITEST) {
  mockWindows('main');
  mockIPC(() => {});
}

// used to globally store hooks tauri hooks
// eslint-disable-next-line import/first
import { TauriEvent } from '@tauri-apps/api/event';
// eslint-disable-next-line import/first
import { appWindow } from '@tauri-apps/api/window';

class TauriEventHandler {
  intern_funcs: (() => void | Promise<void>)[] = [];

  intern_handledEvent: TauriEvent;

  intern_getFuncIndex(func: () => void | Promise<void>) {
    return this.intern_funcs.indexOf(func);
  }

  intern_registerTauriEventListener() {
    const unlistenPromise = appWindow.listen(
      this.intern_handledEvent,
      async () => {
        // eslint-disable-next-line no-restricted-syntax
        for (const func of this.intern_funcs) {
          // eslint-disable-next-line no-await-in-loop
          await func();
        }
      },
    );
    // eslint-disable-next-line @typescript-eslint/no-use-before-define
    registerTauriEventListener(TauriEvent.WINDOW_CLOSE_REQUESTED, async () => {
      (await unlistenPromise)();
    });
  }

  constructor(tauriEvent: TauriEvent) {
    this.intern_handledEvent = tauriEvent;
    this.intern_registerTauriEventListener();
  }

  registerListener(func: () => void | Promise<void>): boolean {
    if (this.intern_getFuncIndex(func) > -1) {
      // already registered
      return false;
    }
    this.intern_funcs.push(func);
    return true;
  }

  // source: https://stackoverflow.com/a/5767357
  removeListener(func: () => void | Promise<void>): boolean {
    const index = this.intern_getFuncIndex(func);
    if (index > -1) {
      // only splice array when item is found
      this.intern_funcs.splice(index, 1); // 2nd parameter means remove one item only
      return true;
    }
    return false;
  }
}

class OnCloseRequestedTauriEventHandler extends TauriEventHandler {
  intern_registerTauriEventListener() {
    const windowCloseUnlistenPromise = appWindow.onCloseRequested(async () => {
      // eslint-disable-next-line no-restricted-syntax
      for (const func of this.intern_funcs) {
        // eslint-disable-next-line no-await-in-loop
        await func();
      }
      (await windowCloseUnlistenPromise)();
    });
  }
}

const tauriEventHandlers = new Map<TauriEvent, TauriEventHandler>();

export function registerTauriEventListener(
  tauriEvent: TauriEvent,
  func: () => void | Promise<void>,
) {
  const handler = tauriEventHandlers.get(tauriEvent);
  if (handler) {
    return handler.registerListener(func);
  }

  if (tauriEvent === TauriEvent.WINDOW_DESTROYED) {
    // The event will not be noticed by the same window.
    return false;
  }

  const newHandler =
    tauriEvent === TauriEvent.WINDOW_CLOSE_REQUESTED
      ? new OnCloseRequestedTauriEventHandler(tauriEvent)
      : new TauriEventHandler(tauriEvent);
  tauriEventHandlers.set(tauriEvent, newHandler);
  return newHandler.registerListener(func);
}

export function removeTauriEventListener(
  tauriEvent: TauriEvent,
  func: () => void | Promise<void>,
) {
  const handler = tauriEventHandlers.get(tauriEvent);
  return handler ? handler.removeListener(func) : false;
}
