/* eslint-disable max-classes-per-file */

// used to globally store hooks tauri hooks

import { TauriEvent } from '@tauri-apps/api/event';
import { appWindow } from '@tauri-apps/api/window';
import { showError } from './tauri-dialog';

class TauriEventHandler {
  intern_funcs: (() => Promise<void>)[] = [];

  intern_handledEvent: TauriEvent;

  intern_getFuncIndex(func: () => Promise<void>) {
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
      }
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

  registerListener(func: () => Promise<void>): boolean {
    if (this.intern_getFuncIndex(func) > -1) {
      showError(
        `The following function was already registered for ${this.intern_handledEvent}:\n\n${func}`
      );
      return false;
    }
    this.intern_funcs.push(func);
    return true;
  }

  // source: https://stackoverflow.com/a/5767357
  removeListener(func: () => Promise<void>): boolean {
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
  func: () => Promise<void>
) {
  const handler = tauriEventHandlers.get(tauriEvent);
  if (handler) {
    return handler.registerListener(func);
  }

  if (tauriEvent === TauriEvent.WINDOW_DESTROYED) {
    showError(
      `The event ${tauriEvent} will not be noticed by the same window.`
    );
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
  func: () => Promise<void>
) {
  const handler = tauriEventHandlers.get(tauriEvent);
  return handler ? handler.removeListener(func) : false;
}
