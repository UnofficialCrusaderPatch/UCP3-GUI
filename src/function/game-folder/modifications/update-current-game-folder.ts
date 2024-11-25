import {
  setOverlayContent,
  BlankOverlayContent,
  forceClearOverlayContent,
} from '../../../components/overlay/overlay';
import { EXTENSIONS_STATE_IS_DISK_DIRTY_ATOM } from '../../../components/ucp-tabs/content-manager/state/atoms';
import { getStore } from '../../../hooks/jotai/base';
import {
  GAME_FOLDER_ATOM,
  ASYNC_GAME_FOLDER_ATOM,
  GAME_FOLDER_SET_MOMENT_ATOM,
} from '../interface';

async function waitForNewFolderSet(oldMoment: number) {
  let waitForReload = true;
  while (waitForReload) {
    // eslint-disable-next-line no-await-in-loop
    waitForReload = await new Promise((resolve) => {
      setTimeout(() => {
        // This line causes infinite spin when updating to the same folder
        // eslint-disable-next-line eqeqeq
        resolve(oldMoment == getStore().get(GAME_FOLDER_SET_MOMENT_ATOM));
      }, 100);
    });
  }
}

/**
 * Needs to receive a function that changes the game folder in some way.
 * If return is null, nothing happens, if the folder is equal to the current,
 * it will reload. In any other case, the given function needs to return the expected new folder and
 * this function will wait until the game atom updates, so be sure what you are doing if this used.
 */
// eslint-disable-next-line import/prefer-default-export
export async function updateCurrentGameFolder(
  gameFolderUpdateFunction: () => Promise<null | string>,
) {
  const oldSetTime = getStore().get(GAME_FOLDER_SET_MOMENT_ATOM);
  const oldGameFolderObject = getStore().get(GAME_FOLDER_ATOM);
  setOverlayContent(BlankOverlayContent);
  try {
    const newFolder = await gameFolderUpdateFunction();
    if (!newFolder) {
      return;
    }

    // failsafe, in case this happens for some reason
    if (newFolder === oldGameFolderObject) {
      getStore().set(ASYNC_GAME_FOLDER_ATOM);
    }
    await waitForNewFolderSet(oldSetTime);
  } finally {
    getStore().set(EXTENSIONS_STATE_IS_DISK_DIRTY_ATOM, false);
    forceClearOverlayContent();
  }
}
