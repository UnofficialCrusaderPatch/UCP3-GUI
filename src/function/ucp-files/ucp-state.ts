import Result from 'util/structs/result';
import { copyFile, Error, resolvePath } from 'tauri/tauri-files';
import { TFunction } from 'i18next';
import { getHexHashOfFile } from 'util/scripts/hash';
import Logger from 'util/scripts/logging';
import { atomWithRefresh, getStore } from 'hooks/jotai/base';
import { GAME_FOLDER_ATOM } from 'function/global/global-atoms';
import { atom } from 'jotai';
import { getTranslation } from 'localization/i18n';

const LOGGER = new Logger('ucp-state.ts').shouldPrettyJson(true);

const REAL_BINK_HASHS = new Set(
  'ee68dcf51e8e3b482f9fb5ef617f44a2d9e970d03f3ed21fe26d40cd63c57a48',
);

export const enum UCPState {
  WRONG_FOLDER, // based only on the state of the bink.dlls
  NOT_INSTALLED, // based only on the state of the bink.dlls
  ACTIVE,
  INACTIVE,
  BINK_VERSION_DIFFERENCE, // may happen in case of update
  UNKNOWN,
}

const BINK_PATH_ATOM = atom((get) =>
  resolvePath(get(GAME_FOLDER_ATOM), 'binkw32.dll'),
);
const BINK_REAL_PATH_ATOM = atom((get) =>
  resolvePath(get(GAME_FOLDER_ATOM), 'binkw32_real.dll'),
);
const BINK_UCP_PATH_ATOM = atom((get) =>
  resolvePath(get(GAME_FOLDER_ATOM), 'binkw32_ucp.dll'),
);

export const UCP_STATE_ATOM = atomWithRefresh(async (get) => {
  const binkShaPromise = getHexHashOfFile(await get(BINK_PATH_ATOM)).catch(
    () => null,
  );
  const binkRealShaPromise = getHexHashOfFile(
    await get(BINK_REAL_PATH_ATOM),
  ).catch(() => null);
  const binkUcpShaPromise = getHexHashOfFile(
    await get(BINK_UCP_PATH_ATOM),
  ).catch(() => null);
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

  if (!binkRealSha || !binkUcpSha) {
    return binkRealSha || binkUcpSha
      ? UCPState.UNKNOWN
      : UCPState.NOT_INSTALLED;
  }

  // at this point all binks are present

  if (binkSha === binkRealSha) {
    return binkSha !== binkUcpSha ? UCPState.INACTIVE : UCPState.UNKNOWN;
  }
  if (binkSha === binkUcpSha) {
    return binkSha !== binkRealSha ? UCPState.ACTIVE : UCPState.UNKNOWN;
  }
  return UCPState.BINK_VERSION_DIFFERENCE; // if the three are different
});

export async function createRealBink(): Promise<Result<void, unknown>> {
  const t = getTranslation('gui-download');

  switch (await getStore().get(UCP_STATE_ATOM)) {
    case UCPState.WRONG_FOLDER:
      return Result.err(t('gui-download:bink.missing'));
    case UCPState.NOT_INSTALLED: {
      const copyResult = (
        await copyFile(
          await getStore().get(BINK_PATH_ATOM),
          await getStore().get(BINK_REAL_PATH_ATOM),
        )
      ).mapErr((error) => t('gui-download:bink.copy.error', { error }));
      getStore().set(UCP_STATE_ATOM);
      return copyResult;
    }
    case UCPState.UNKNOWN:
      return Result.err(t('gui-download:bink.unknown.state'));
    default:
      return Result.emptyOk();
  }
}

export async function activateUCP(): Promise<Result<void, Error>> {
  const t = getTranslation('gui-download');

  switch (await getStore().get(UCP_STATE_ATOM)) {
    case UCPState.WRONG_FOLDER:
      return Result.err(t('gui-download:bink.missing'));
    case UCPState.NOT_INSTALLED:
      return Result.err(t('gui-download:bink.not.installed'));
    case UCPState.UNKNOWN:
      return Result.err(t('gui-download:bink.unknown.state'));
    case UCPState.ACTIVE:
      return Result.emptyOk();
    case UCPState.INACTIVE:
    case UCPState.BINK_VERSION_DIFFERENCE: {
      const copyResult = (
        await copyFile(
          await getStore().get(BINK_UCP_PATH_ATOM),
          await getStore().get(BINK_PATH_ATOM),
        )
      ).mapErr((error) => t('gui-download:bink.copy.ucp.error', { error }));
      getStore().set(UCP_STATE_ATOM);
      return copyResult;
    }
    default:
      return Result.err('Received unknown UCP state. This should not happen.');
  }
}

export async function deactivateUCP(): Promise<Result<void, Error>> {
  const t = getTranslation('gui-download');

  switch (await getStore().get(UCP_STATE_ATOM)) {
    case UCPState.WRONG_FOLDER:
      return Result.err(t('gui-download:bink.missing'));
    case UCPState.NOT_INSTALLED:
      return Result.err(t('gui-download:bink.not.installed'));
    case UCPState.UNKNOWN:
      return Result.err(t('gui-download:bink.unknown.state'));
    case UCPState.INACTIVE:
      return Result.emptyOk();
    case UCPState.ACTIVE:
    case UCPState.BINK_VERSION_DIFFERENCE: {
      const copyResult = (
        await copyFile(
          await getStore().get(BINK_REAL_PATH_ATOM),
          await getStore().get(BINK_PATH_ATOM),
        )
      ).mapErr((error) => t('gui-download:bink.copy.real.error', { error }));
      getStore().set(UCP_STATE_ATOM);
      return copyResult;
    }
    default:
      return Result.err('Received unknown UCP state. This should not happen.');
  }
}
