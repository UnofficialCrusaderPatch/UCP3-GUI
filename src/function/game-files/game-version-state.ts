import { GAME_FOLDER_ATOM } from 'function/global/global-atoms';
import { selectAtom } from 'jotai/utils';
import { getExtremeHash, getVanillaHash } from './game-hash';
import { EMPTY_GAME_VERSION, getGameVersionForHash } from './game-version';

export const VANILLA_VERSION_ATOM = selectAtom(
  GAME_FOLDER_ATOM,
  async (folder) =>
    (await getVanillaHash(folder))
      .map(getGameVersionForHash)
      .getOrElse(EMPTY_GAME_VERSION),
);

export const EXTREME_VERSION_ATOM = selectAtom(
  GAME_FOLDER_ATOM,
  async (folder) =>
    (await getExtremeHash(folder))
      .map(getGameVersionForHash)
      .getOrElse(EMPTY_GAME_VERSION),
);
