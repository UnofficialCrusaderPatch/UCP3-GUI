/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-new-wrappers */
import { atom } from 'jotai';
import { loadable } from 'jotai/utils';
import { resolvePath } from '../../tauri/tauri-files';
import { atomWithRefresh } from '../../hooks/jotai/base';
import { getHexHashOfFile } from '../../util/scripts/hash';
import Logger from '../../util/scripts/logging';
import {
  BINK_FILENAME,
  REAL_BINK_FILENAME,
  UCP_BINK_FILENAME,
} from '../global/constants/file-constants';
import { showModalOk } from '../../components/modals/modal-ok';
import { ASYNC_GAME_FOLDER_ATOM } from '../game-folder/interface';

const LOGGER = new Logger('ucp-state.ts').shouldPrettyJson(true);

const REAL_BINK_HASHS = new Set([
  'ee68dcf51e8e3b482f9fb5ef617f44a2d9e970d03f3ed21fe26d40cd63c57a48',
]);

export const enum UCPFilesState {
  WRONG_FOLDER, // based only on the state of the bink.dlls
  NOT_INSTALLED, // based only on the state of the bink.dlls
  NOT_INSTALLED_WITH_REAL_BINK, // a real bink exists with the same hash as the normal one, but no ucp bink
  ACTIVE,
  INACTIVE,
  BINK_VERSION_DIFFERENCE, // may happen in case of update
  BINK_UCP_MISSING,
  BINK_REAL_COPY_MISSING, // means "despite ucp present"
  INVALID, // known broken cases
  UNKNOWN,
}

async function getBinkPath(gameFolder: string, binkName: string) {
  if (!gameFolder) {
    return '';
  }
  return resolvePath(gameFolder, binkName);
}

export const BINK_PATHS_ATOM = atom(async (get) => {
  const gameFolder = await get(ASYNC_GAME_FOLDER_ATOM);
  return {
    base: await getBinkPath(gameFolder, BINK_FILENAME),
    real: await getBinkPath(gameFolder, REAL_BINK_FILENAME),
    ucp: await getBinkPath(gameFolder, UCP_BINK_FILENAME),
  };
});

export const UCP_FILES_STATE_ATOM = atomWithRefresh(async (get) => {
  const binkPaths = await get(BINK_PATHS_ATOM);
  const binkPath = binkPaths.base;
  const binkRealPath = binkPaths.real;
  const binkUcpPath = binkPaths.ucp;

  if (!binkPath || !binkRealPath || !binkUcpPath) {
    return UCPFilesState.UNKNOWN;
  }

  const binkShaPromise = getHexHashOfFile(binkPath).catch(() => null);
  const binkRealShaPromise = getHexHashOfFile(binkRealPath).catch(() => null);
  const binkUcpShaPromise = getHexHashOfFile(binkUcpPath).catch(() => null);
  const binkSha = await binkShaPromise;
  const binkRealSha = await binkRealShaPromise;
  const binkUcpSha = await binkUcpShaPromise;

  LOGGER.msg(`File hashes: {}`, {
    binkSha,
    binkRealSha,
    binkUcpSha,
  }).debug();

  if (!binkSha) {
    return UCPFilesState.WRONG_FOLDER;
  }

  if (!!binkRealSha && !REAL_BINK_HASHS.has(binkRealSha)) {
    showModalOk({
      title: 'warning',
      message: 'bink.real.unknown',
    });
  }

  if (!binkUcpSha) {
    if (binkSha === binkRealSha) {
      return UCPFilesState.NOT_INSTALLED_WITH_REAL_BINK;
    }
    return binkRealSha
      ? UCPFilesState.BINK_UCP_MISSING
      : UCPFilesState.NOT_INSTALLED;
  }

  if (!binkRealSha) {
    if (REAL_BINK_HASHS.has(binkSha)) {
      return UCPFilesState.BINK_REAL_COPY_MISSING;
    }
    showModalOk({
      title: 'warning',
      message: 'bink.real.invalid.missing',
    });
    return UCPFilesState.INVALID;
  }

  // at this point all binks are present

  if (binkSha === binkRealSha) {
    if (binkSha !== binkUcpSha) {
      return UCPFilesState.INACTIVE;
    }
    showModalOk({
      title: 'warning',
      message: 'bink.all.same',
    });
    return UCPFilesState.UNKNOWN;
  }
  if (binkSha === binkUcpSha) {
    return UCPFilesState.ACTIVE;
  }

  if (REAL_BINK_HASHS.has(binkRealSha)) {
    return UCPFilesState.BINK_VERSION_DIFFERENCE; // valid, since we still have a real one
  }
  showModalOk({
    title: 'warning',
    message: 'bink.mixed.real.unknown',
  });
  return UCPFilesState.UNKNOWN;
});

export const LOADABLE_UCP_STATE_ATOM = loadable(UCP_FILES_STATE_ATOM);
