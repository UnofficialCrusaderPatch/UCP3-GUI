// used to globally store hooks tauri hooks

import { appWindow } from "@tauri-apps/api/window";
import { showError } from "./dialog-util";



// on window close stuff

const onWindowCloseFuncs = new Map();

// module await is apparently not supported
// the promise will not be awaited, since at the moment it is assumed
// the shutdown happens, so no clean-up is performed
const windowCloseUnlistenPromise = appWindow.onCloseRequested(async () => {
    for (const [_, func] of onWindowCloseFuncs) {
        await func();
    }
});

export function unregisterForWindowClose(key: unknown): boolean {
    return onWindowCloseFuncs.delete(key);
};

export function registerForWindowClose(key: unknown, func: () => Promise<void>): boolean {
    if (onWindowCloseFuncs.has(key)) {
        showError(`The key ${key} was already used to place a window close function.`);
        return false;
    }
    onWindowCloseFuncs.set(key, func);
    return true;
};