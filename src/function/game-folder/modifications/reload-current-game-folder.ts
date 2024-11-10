import { getStore } from '../../../hooks/jotai/base';
import { GAME_FOLDER_ATOM } from '../interface';
import { LOGGER } from '../logger';
import { updateCurrentGameFolder } from './update-current-game-folder';

// eslint-disable-next-line import/prefer-default-export
export function reloadCurrentGameFolder() {
  LOGGER.msg('reloading current game folder').debug();
  updateCurrentGameFolder(async () => {
    const currentGameFolderString = getStore().get(GAME_FOLDER_ATOM);
    return currentGameFolderString !== undefined &&
      currentGameFolderString != null
      ? currentGameFolderString
      : null;
  });
}
