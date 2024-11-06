import { atom } from 'jotai';
import { Atom } from 'jotai/vanilla';
import getGameExeHash from './game-hash';
import {
  EMPTY_GAME_VERSION,
  GameVersionInstance,
  getGameVersionForHash,
} from './game-version';
import EXE_PATHS_ATOM from './game-path';
import { GameDataWrapper } from './game-data';

async function getGameVersionForPath(path: string) {
  return (await getGameExeHash(path))
    .map(getGameVersionForHash)
    .getOrReceive(() => Promise.resolve(EMPTY_GAME_VERSION));
}

const GAME_VERSION_ATOM: Atom<Promise<GameDataWrapper<GameVersionInstance>>> =
  atom(async (get) => {
    const exePaths = await get(EXE_PATHS_ATOM);
    return {
      vanilla: await getGameVersionForPath(exePaths.vanilla),
      extreme: await getGameVersionForPath(exePaths.extreme),
    };
  });

export default GAME_VERSION_ATOM;
