import { getStore } from '../../../hooks/jotai/base';
import { GAME_FOLDER_ATOM } from '../interface';
import { updateCurrentGameFolder } from './update-current-game-folder';

// eslint-disable-next-line import/prefer-default-export
export function reloadCurrentGameFolder() {
  updateCurrentGameFolder(async () => {
    const currentGameFolderString = getStore().get(GAME_FOLDER_ATOM);
    return currentGameFolderString != null
      ? currentGameFolderString.valueOf()
      : null;
  });
}
