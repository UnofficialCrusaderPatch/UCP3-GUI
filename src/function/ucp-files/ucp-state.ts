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

export const enum UCPState {
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
  const gameFolder = (await get(ASYNC_GAME_FOLDER_ATOM)).valueOf();
  return {
    base: await getBinkPath(gameFolder, BINK_FILENAME),
    real: await getBinkPath(gameFolder, REAL_BINK_FILENAME),
    ucp: await getBinkPath(gameFolder, UCP_BINK_FILENAME),
  };
});

export const UCP_STATE_ATOM = atomWithRefresh(async (get) => {
  const binkPaths = await get(BINK_PATHS_ATOM);
  const binkPath = binkPaths.base;
  const binkRealPath = binkPaths.real;
  const binkUcpPath = binkPaths.ucp;

  if (!binkPath || !binkRealPath || !binkUcpPath) {
    return UCPState.UNKNOWN;
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
    return UCPState.WRONG_FOLDER;
  }

  if (!!binkRealSha && !REAL_BINK_HASHS.has(binkRealSha)) {
    await showModalOk({
      title: 'warning',
      message: 'bink.real.unknown',
    });
  }

  if (!binkUcpSha) {
    if (binkSha === binkRealSha) {
      return UCPState.NOT_INSTALLED_WITH_REAL_BINK;
    }
    return binkRealSha ? UCPState.BINK_UCP_MISSING : UCPState.NOT_INSTALLED;
  }

  if (!binkRealSha) {
    if (REAL_BINK_HASHS.has(binkSha)) {
      return UCPState.BINK_REAL_COPY_MISSING;
    }
    await showModalOk({
      title: 'warning',
      message: 'bink.real.invalid.missing',
    });
    return UCPState.INVALID;
  }

  // at this point all binks are present

  if (binkSha === binkRealSha) {
    if (binkSha !== binkUcpSha) {
      return UCPState.INACTIVE;
    }
    await showModalOk({
      title: 'warning',
      message: 'bink.all.same',
    });
    return UCPState.UNKNOWN;
  }
  if (binkSha === binkUcpSha) {
    return UCPState.ACTIVE;
  }

  if (REAL_BINK_HASHS.has(binkRealSha)) {
    return UCPState.BINK_VERSION_DIFFERENCE; // valid, since we still have a real one
  }
  await showModalOk({
    title: 'warning',
    message: 'bink.mixed.real.unknown',
  });
  return UCPState.UNKNOWN;
});

export const LOADABLE_UCP_STATE_ATOM = loadable(UCP_STATE_ATOM);

export async function createRealBink(): Promise<Result<void, MessageType>> {
  const binkPaths = await getStore().get(BINK_PATHS_ATOM);
  switch (await getStore().get(UCP_STATE_ATOM)) {
    case UCPState.WRONG_FOLDER:
      return Result.err('bink.missing');
    case UCPState.BINK_REAL_COPY_MISSING: // safe, since verified
    case UCPState.NOT_INSTALLED: {
      const copyResult = (
        await copyFile(binkPaths.base, binkPaths.real)
      ).mapErr((error) => ({ key: 'bink.copy.error', args: { error } }));
      getStore().set(UCP_STATE_ATOM);
      return copyResult;
    }
    case UCPState.UNKNOWN:
      return Result.err('bink.unknown.state');
    case UCPState.INVALID:
      return Result.err('bink.invalid.state');
    default:
      return Result.emptyOk();
  }
}

export async function activateUCP(): Promise<Result<void, MessageType>> {
  const binkPaths = await getStore().get(BINK_PATHS_ATOM);
  const ucpState = await getStore().get(UCP_STATE_ATOM);
  switch (ucpState) {
    case UCPState.WRONG_FOLDER:
      return Result.err('bink.missing');
    case UCPState.NOT_INSTALLED:
    case UCPState.NOT_INSTALLED_WITH_REAL_BINK:
      return Result.err('bink.not.installed');
    case UCPState.UNKNOWN:
      return Result.err('bink.unknown.state');
    case UCPState.INVALID:
      return Result.err('bink.invalid.state');
    case UCPState.ACTIVE:
      return Result.emptyOk();
    case UCPState.INACTIVE:
    case UCPState.BINK_VERSION_DIFFERENCE:
    case UCPState.BINK_REAL_COPY_MISSING: {
      if (ucpState === UCPState.BINK_REAL_COPY_MISSING) {
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
      getStore().set(UCP_STATE_ATOM);
      return copyResult;
    }
    case UCPState.BINK_UCP_MISSING: {
      // copy bink to missing ucp bink, assuming this case installed manually
      const copyResult = (await copyFile(binkPaths.base, binkPaths.ucp)).mapErr(
        (error) => ({
          key: 'bink.copy.error',
          args: { error },
        }),
      );
      getStore().set(UCP_STATE_ATOM);
      return copyResult;
    }
    default:
      return Result.err('Received unknown UCP state. This should not happen.');
  }
}

export async function deactivateUCP(): Promise<Result<void, MessageType>> {
  const binkPaths = await getStore().get(BINK_PATHS_ATOM);
  const ucpState = await getStore().get(UCP_STATE_ATOM);
  switch (ucpState) {
    case UCPState.WRONG_FOLDER:
      return Result.err('bink.missing');
    case UCPState.NOT_INSTALLED:
    case UCPState.NOT_INSTALLED_WITH_REAL_BINK:
      return Result.err('bink.not.installed');
    case UCPState.UNKNOWN:
      return Result.err('bink.unknown.state');
    case UCPState.INVALID:
      return Result.err('bink.invalid.state');
    case UCPState.INACTIVE:
      return Result.emptyOk();
    case UCPState.ACTIVE:
    case UCPState.BINK_VERSION_DIFFERENCE:
    case UCPState.BINK_UCP_MISSING: {
      if (ucpState === UCPState.BINK_UCP_MISSING) {
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
      getStore().set(UCP_STATE_ATOM);
      return copyResult;
    }
    case UCPState.BINK_REAL_COPY_MISSING: {
      // copy bink to missing real bink, assuming this case installed manually
      const copyResult = (
        await copyFile(binkPaths.base, binkPaths.real)
      ).mapErr((error) => ({
        key: 'bink.copy.error',
        args: { error },
      }));
      getStore().set(UCP_STATE_ATOM);
      return copyResult;
    }

    default:
      return Result.err('Received unknown UCP state. This should not happen.');
  }
}
