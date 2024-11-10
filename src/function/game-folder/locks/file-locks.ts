import { getStore } from '../../../hooks/jotai/base';
import { onFsExists, renameFile } from '../../../tauri/tauri-files';
import Logger from '../../../util/scripts/logging';
import { GAME_FOLDER_ATOM } from '../interface';

const LOGGER = new Logger(`file-locks.ts`);

// eslint-disable-next-line import/prefer-default-export
export const hintThatGameMayBeRunning = async () => {
  const folder = getStore().get(GAME_FOLDER_ATOM);

  const path = `${folder}/binkw32.dll`;

  if (!(await onFsExists(path))) {
    throw Error(
      `binkw32.dll does not exist, are we in a game folder? path: ${path}`,
    );
  }

  const newPath = `${path}.tmp`;

  let result = false;
  let moved = false;

  try {
    const renameResult = await renameFile(path, newPath);

    if (renameResult.isErr()) {
      LOGGER.msg(
        `Renaming binkw32.dll failed, because: ${renameResult.err().getOrElse('')}`,
      ).error();
      result = true;
    }

    if (renameResult.isOk()) {
      result = false;
      moved = true;
    }
  } catch (e: unknown) {
    LOGGER.msg(
      `Renaming binkw32.dll failed for an unknown reason: ${e}`,
    ).error();

    result = true;
  }

  if (moved) {
    await renameFile(newPath, path);
  }

  return result;
};
