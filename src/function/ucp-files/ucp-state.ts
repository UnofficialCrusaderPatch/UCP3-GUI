/* eslint-disable @typescript-eslint/ban-types */
/* eslint-disable no-new-wrappers */
import { atom } from 'jotai';
import { loadable } from 'jotai/utils';
import { copyFile, resolvePath } from '../../tauri/tauri-files';
import { atomWithRefresh, getStore } from '../../hooks/jotai/base';
import Result from '../../util/structs/result';
import { getHexHashOfFile } from '../../util/scripts/hash';
import Logger from '../../util/scripts/logging';
import {
  BINK_FILENAME,
  REAL_BINK_FILENAME,
  UCP_BINK_FILENAME,
} from '../global/constants/file-constants';
import { showModalOk } from '../../components/modals/modal-ok';
import { MessageType } from '../../localization/localization';
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

const BINK_PATHS_ATOM = atom(async (get) => {
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

export async function createRealBink(): Promise<Result<void, MessageType>> {
  const binkPaths = await getStore().get(BINK_PATHS_ATOM);
  switch (await getStore().get(UCP_FILES_STATE_ATOM)) {
    case UCPFilesState.WRONG_FOLDER:
      return Result.err('bink.missing');
    case UCPFilesState.BINK_REAL_COPY_MISSING: // safe, since verified
    case UCPFilesState.NOT_INSTALLED: {
      const copyResult = (
        await copyFile(binkPaths.base, binkPaths.real)
      ).mapErr((error) => ({ key: 'bink.copy.error', args: { error } }));
      getStore().set(UCP_FILES_STATE_ATOM);
      return copyResult;
    }
    case UCPFilesState.UNKNOWN:
      return Result.err('bink.unknown.state');
    case UCPFilesState.INVALID:
      return Result.err('bink.invalid.state');
    default:
      return Result.emptyOk();
  }
}

export async function activateUCP(): Promise<Result<void, MessageType>> {
  const binkPaths = await getStore().get(BINK_PATHS_ATOM);
  const ucpState = await getStore().get(UCP_FILES_STATE_ATOM);
  switch (ucpState) {
    case UCPFilesState.WRONG_FOLDER:
      return Result.err('bink.missing');
    case UCPFilesState.NOT_INSTALLED:
    case UCPFilesState.NOT_INSTALLED_WITH_REAL_BINK:
      return Result.err('bink.not.installed');
    case UCPFilesState.UNKNOWN:
      return Result.err('bink.unknown.state');
    case UCPFilesState.INVALID:
      return Result.err('bink.invalid.state');
    case UCPFilesState.ACTIVE:
      return Result.emptyOk();
    case UCPFilesState.INACTIVE:
    case UCPFilesState.BINK_VERSION_DIFFERENCE:
    case UCPFilesState.BINK_REAL_COPY_MISSING: {
      if (ucpState === UCPFilesState.BINK_REAL_COPY_MISSING) {
        // copy bink to missing real bink, assuming this case installed manually
        const ucpBinkCopyResult = (
          await copyFile(binkPaths.base, binkPaths.real)
        ).mapErr((error) => ({
          key: 'bink.copy.error',
          args: { error },
        }));
        if (ucpBinkCopyResult.isErr()) {
          return ucpBinkCopyResult;
        }
      }

      const copyResult = (await copyFile(binkPaths.ucp, binkPaths.base)).mapErr(
        (error) => ({
          key: 'bink.copy.ucp.error',
          args: { error },
        }),
      );
      getStore().set(UCP_FILES_STATE_ATOM);
      return copyResult;
    }
    case UCPFilesState.BINK_UCP_MISSING: {
      // copy bink to missing ucp bink, assuming this case installed manually
      const copyResult = (await copyFile(binkPaths.base, binkPaths.ucp)).mapErr(
        (error) => ({
          key: 'bink.copy.error',
          args: { error },
        }),
      );
      getStore().set(UCP_FILES_STATE_ATOM);
      return copyResult;
    }
    default:
      return Result.err('Received unknown UCP state. This should not happen.');
  }
}

export async function deactivateUCP(): Promise<Result<void, MessageType>> {
  const binkPaths = await getStore().get(BINK_PATHS_ATOM);
  const ucpState = await getStore().get(UCP_FILES_STATE_ATOM);
  switch (ucpState) {
    case UCPFilesState.WRONG_FOLDER:
      return Result.err('bink.missing');
    case UCPFilesState.NOT_INSTALLED:
    case UCPFilesState.NOT_INSTALLED_WITH_REAL_BINK:
      return Result.err('bink.not.installed');
    case UCPFilesState.UNKNOWN:
      return Result.err('bink.unknown.state');
    case UCPFilesState.INVALID:
      return Result.err('bink.invalid.state');
    case UCPFilesState.INACTIVE:
      return Result.emptyOk();
    case UCPFilesState.ACTIVE:
    case UCPFilesState.BINK_VERSION_DIFFERENCE:
    case UCPFilesState.BINK_UCP_MISSING: {
      if (ucpState === UCPFilesState.BINK_UCP_MISSING) {
        // copy bink to missing ucp bink, assuming this case installed manually
        const ucpBinkCopyResult = (
          await copyFile(binkPaths.base, binkPaths.ucp)
        ).mapErr((error) => ({
          key: 'bink.copy.error',
          args: { error },
        }));
        if (ucpBinkCopyResult.isErr()) {
          return ucpBinkCopyResult;
        }
      }

      const copyResult = (
        await copyFile(binkPaths.real, binkPaths.base)
      ).mapErr((error) => ({
        key: 'bink.copy.real.error',
        args: { error },
      }));
      getStore().set(UCP_FILES_STATE_ATOM);
      return copyResult;
    }
    case UCPFilesState.BINK_REAL_COPY_MISSING: {
      // copy bink to missing real bink, assuming this case installed manually
      const copyResult = (
        await copyFile(binkPaths.base, binkPaths.real)
      ).mapErr((error) => ({
        key: 'bink.copy.error',
        args: { error },
      }));
      getStore().set(UCP_FILES_STATE_ATOM);
      return copyResult;
    }

    default:
      return Result.err('Received unknown UCP state. This should not happen.');
  }
}
