// for creating an managing new windows
// currently it will just take care that only of window can be crated
// the main (landing) window is ignored)

import { WebviewWindow, WindowOptions } from "@tauri-apps/api/window";
import { getHexHashOfString } from "./general-utils";

const createdWindows: { [key: string]: WebviewWindow } = {};

export function getWindowIfExists(windowName: string): undefined | WebviewWindow {
    return createdWindows[windowName];
}

// I do not like this solution one bit -TheRedDaemon
// normally one would have to listen to the create event, but this event returns
// a listener, not a result, so waiting for it is even harder
// maybe there is a solution with callbacks...
export async function createNewWindow(windowName: string, options: WindowOptions,
    errorIfExists: boolean = false): Promise<void> {

    // if it exits, the options are ignored and the window is given focus
    if (createdWindows.hasOwnProperty(windowName)) {
        if (errorIfExists) {
            throw `Window with name '${windowName}' already exits!`;
        }
        // allows to set focus
        if (options.focus) {
            await createdWindows[windowName].setFocus();
        }
        return;
    }

    // uses a hash
    const webview = new WebviewWindow(await getHexHashOfString(windowName), options);

    // also expects close to go through
    await webview.onCloseRequested(() => {
        delete createdWindows[windowName];
    });
    createdWindows[windowName] = webview;
}