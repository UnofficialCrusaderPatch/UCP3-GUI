import Result from 'util/structs/result';
import { copyFile, Error, resolvePath } from 'tauri/tauri-files';
import { TFunction } from 'i18next';
import { getHexHashOfFile } from 'util/scripts/hash';
import Logger from 'util/scripts/logging';

const LOGGER = new Logger('ucp-state.ts').shouldPrettyJson(true);

export enum UCPState {
  WRONG_FOLDER, // based only on the state of the bink.dlls
  NOT_INSTALLED, // based only on the state of the bink.dlls
  ACTIVE,
  INACTIVE,
  BINK_VERSION_DIFFERENCE, // may happen in case of update
  UNKNOWN,
}

function getBinkPath(gameFolder: string): Promise<string> {
  return resolvePath(gameFolder, 'binkw32.dll');
}

function getBinkRealPath(gameFolder: string): Promise<string> {
  return resolvePath(gameFolder, 'binkw32_real.dll');
}

function getBinkUCPPath(gameFolder: string): Promise<string> {
  return resolvePath(gameFolder, 'binkw32_ucp.dll');
}

export async function getUCPState(
  gameFolder: string,
  binkPath?: string,
  binkRealPath?: string,
  binkUcpPath?: string,
): Promise<UCPState> {
  // eslint-disable-next-line no-param-reassign
  binkPath = binkPath || (await getBinkPath(gameFolder));
  // eslint-disable-next-line no-param-reassign
  binkRealPath = binkRealPath || (await getBinkRealPath(gameFolder));
  // eslint-disable-next-line no-param-reassign
  binkUcpPath = binkUcpPath || (await getBinkUCPPath(gameFolder));

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
}

export async function createRealBink(
  gameFolder: string,
  t?: TFunction,
  ucpState?: UCPState,
): Promise<Result<void, unknown>> {
  const binkPath = await getBinkPath(gameFolder);
  const binkRealPath = await getBinkRealPath(gameFolder);

  switch (ucpState || (await getUCPState(gameFolder, binkPath, binkRealPath))) {
    case UCPState.WRONG_FOLDER:
      return Result.err(t ? t('gui-download:bink.missing') : 'Bink missing.');
    case UCPState.NOT_INSTALLED:
      return (await copyFile(binkPath, binkRealPath)).mapErr((error) =>
        t ? t('gui-download:bink.copy.error', { error }) : error,
      );
    case UCPState.UNKNOWN:
      return Result.err(
        t ? t('gui-download:bink.unknown.state') : 'Bink state unknown.',
      );
    default:
      return Result.emptyOk();
  }
}

export async function activateUCP(
  gameFolder: string,
  t?: TFunction,
  ucpState?: UCPState,
): Promise<Result<void, Error>> {
  const binkPath = await getBinkPath(gameFolder);
  const binkUcpPath = await getBinkUCPPath(gameFolder);

  switch (
    ucpState ||
    (await getUCPState(gameFolder, binkPath, undefined, binkUcpPath))
  ) {
    case UCPState.WRONG_FOLDER:
      return Result.err(t ? t('gui-download:bink.missing') : 'Bink missing.');
    case UCPState.NOT_INSTALLED:
      return Result.err(
        t ? t('gui-download:bink.not.installed') : 'Not installed.',
      );
    case UCPState.UNKNOWN:
      return Result.err(
        t ? t('gui-download:bink.unknown.state') : 'Bink state unknown.',
      );
    case UCPState.ACTIVE:
      return Result.emptyOk();
    case UCPState.INACTIVE:
    case UCPState.BINK_VERSION_DIFFERENCE:
      return (await copyFile(binkUcpPath, binkPath)).mapErr((error) =>
        t ? t('gui-download:bink.copy.ucp.error', { error }) : error,
      );
    default:
      return Result.err('Received unknown UCP state. This should not happen.');
  }
}

export async function deactivateUCP(
  gameFolder: string,
  t?: TFunction,
  ucpState?: UCPState,
): Promise<Result<void, Error>> {
  const binkPath = await getBinkPath(gameFolder);
  const binkRealPath = await getBinkRealPath(gameFolder);

  switch (ucpState || (await getUCPState(gameFolder, binkPath, binkRealPath))) {
    case UCPState.WRONG_FOLDER:
      return Result.err(t ? t('gui-download:bink.missing') : 'Bink missing.');
    case UCPState.NOT_INSTALLED:
      return Result.err(
        t ? t('gui-download:bink.not.installed') : 'Not installed.',
      );
    case UCPState.UNKNOWN:
      return Result.err(
        t ? t('gui-download:bink.unknown.state') : 'Bink state unknown.',
      );
    case UCPState.INACTIVE:
      return Result.emptyOk();
    case UCPState.ACTIVE:
    case UCPState.BINK_VERSION_DIFFERENCE:
      return (await copyFile(binkRealPath, binkPath)).mapErr((error) =>
        t ? t('gui-download:bink.copy.real.error', { error }) : error,
      );
    default:
      return Result.err('Received unknown UCP state. This should not happen.');
  }
}
