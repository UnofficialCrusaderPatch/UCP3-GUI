import { unwrap } from 'jotai/utils';
import { atom } from 'jotai';
import { atomWithRefresh, getStore } from '../../hooks/jotai/base';
import { initializeUCPVersion } from '../ucp-files/ucp-version';
import { MOST_RECENT_FOLDER_ATOM } from '../gui-settings/gui-file-config';
import { GAME_FOLDER_EMPTY_STRING } from './constants';
import { LOGGER } from './logger';
import { initializeGameFolder } from './initialization/initialize-game-folder';

export const GAME_FOLDER_SET_MOMENT_ATOM = atom<number>(0);

/**
 * Main function for loading the game folder hidden behind an atom.
 * This atom is triggered by:
 *
 * a. a new most recent folder being selected (newFolder gets a new value)
 *
 * b. a set() on this atom which causes a refresh
 *
 * c. dependencies asking for the value of this atom for the first time
 *
 *
 * @note
 * Async Atoms always seem to handle the resulting Promise as new unique object,
 * so any dependency change will trigger an update. However, to handle derived cases, a
 * String wrapper object is used to handle the folder the same in all places.
 * Be aware of this in case of comparisons!
 */
export const ASYNC_GAME_FOLDER_ATOM = atomWithRefresh(async (get) => {
  LOGGER.msg('game folder atom').debug();

  const newFolder = await get(MOST_RECENT_FOLDER_ATOM);

  if (!newFolder) {
    return GAME_FOLDER_EMPTY_STRING;
  }

  LOGGER.msg('Initializing ucp version information').debug();
  const version = await initializeUCPVersion(newFolder);
  LOGGER.msg('Initializing ucp version information finished').debug();

  LOGGER.msg('Initializing game folder').debug();
  await initializeGameFolder(newFolder, version);
  LOGGER.msg('Initializing game folder finished').debug();

  // This setting is slightly delayed to allow the GUI to render
  // waitForNewFolderSet would otherwise be done slightly too early
  setTimeout(() => {
    getStore().set(GAME_FOLDER_SET_MOMENT_ATOM, Date.now());
  }, 100);

  return newFolder;
});

export const GAME_FOLDER_ATOM = unwrap(
  ASYNC_GAME_FOLDER_ATOM,
  (prev) => prev ?? GAME_FOLDER_EMPTY_STRING,
);
