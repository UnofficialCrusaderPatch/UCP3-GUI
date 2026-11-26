// v1: '@tauri-apps/api/window'
import {
  getCurrentWebviewWindow,
  type WebviewWindow as WebviewWindowType,
} from '@tauri-apps/api/webviewWindow';
import type { WindowOptions as V2WindowOptions } from '@tauri-apps/api/window';
import type { WebviewOptions } from '@tauri-apps/api/webview';

export { WebviewWindow } from '@tauri-apps/api/webviewWindow';

/**
 * v1 `appWindow`: the window this code runs in.
 * Resolved lazily (on first use), since v2 throws if no Tauri window context
 * exists yet, e.g. at import time in tests before the IPC mocks are installed.
 */
let current: WebviewWindowType | undefined;
export const appWindow = new Proxy({} as WebviewWindowType, {
  get(_target, property) {
    current ??= getCurrentWebviewWindow();
    const value = Reflect.get(current, property, current);
    return typeof value === 'function' ? value.bind(current) : value;
  },
});

/** v1 `WindowOptions` included the webview options (e.g. `url`). */
export type WindowOptions = V2WindowOptions &
  Omit<WebviewOptions, 'x' | 'y' | 'width' | 'height'>;

/** v1 file drop event payload: the dropped paths. */
export type FileDropEvent = string[];
