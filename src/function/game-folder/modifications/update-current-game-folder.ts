import {
  setOverlayContent,
  BlankOverlayContent,
  forceClearOverlayContent,
} from '../../../components/overlay/overlay';
import { getStore } from '../../../hooks/jotai/base';
import { GAME_FOLDER_ATOM, ASYNC_GAME_FOLDER_ATOM } from '../interface';

async function waitForNewFolderSet(oldGameFolderObject: string) {
  let waitForReload = true;
  while (waitForReload) {
    // eslint-disable-next-line no-await-in-loop
    waitForReload = await new Promise((resolve) => {
      setTimeout(() => {
        resolve(oldGameFolderObject === getStore().get(GAME_FOLDER_ATOM));
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
  const oldGameFolderObject = getStore().get(GAME_FOLDER_ATOM);
  setOverlayContent(BlankOverlayContent);
  try {
    const newFolder = await gameFolderUpdateFunction();
    if (!newFolder) {
      return;
    }

    // failsafe, in case this happens for some reason
    if (newFolder === oldGameFolderObject.valueOf()) {
      getStore().set(ASYNC_GAME_FOLDER_ATOM);
    }
    await waitForNewFolderSet(oldGameFolderObject.valueOf());
  } finally {
    forceClearOverlayContent();
  }
}
