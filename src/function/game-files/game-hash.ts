import { resolvePath } from 'tauri/tauri-files';
import { getHexHashOfFile } from 'util/scripts/hash';
import Logger from 'util/scripts/logging';
import Option from 'util/structs/option';

const LOGGER = new Logger('game-hash.ts');

function getVanillaPath(gameFolder: string): Promise<string> {
  return resolvePath(gameFolder, 'Stronghold Crusader.exe');
}

function getExtremePath(gameFolder: string): Promise<string> {
  return resolvePath(gameFolder, 'Stronghold_Crusader_Extreme.exe');
}

function getAlternativePath(
  gameFolder: string,
  alternativeExe: string,
): Promise<string> {
  return resolvePath(gameFolder, alternativeExe);
}

async function getGameExeHash(exePath: string): Promise<Option<string>> {
  if (!exePath) {
    return Option.ofEmpty(); // silent return, since this means there is nothing to check
  }
  return getHexHashOfFile(exePath)
    .then(Option.of)
    .catch((err) => {
      LOGGER.obj(err).error();
      return Option.ofEmpty();
    });
}

async function getGameExeHashWithFallback(
  fallbackFunc: (gameFolder: string) => Promise<string>,
  gameFolder: string,
  alternativeRelativeExe?: string,
) {
  if (!gameFolder && !alternativeRelativeExe) {
    return Option.ofEmpty<string>();
  }

  const exePath = alternativeRelativeExe
    ? getAlternativePath(gameFolder, alternativeRelativeExe)
    : fallbackFunc(gameFolder);
  return getGameExeHash(await exePath);
}

export async function getVanillaHash(
  gameFolder: string,
  alternativeRelativeExe?: string,
) {
  return getGameExeHashWithFallback(
    getVanillaPath,
    gameFolder,
    alternativeRelativeExe,
  );
}

export async function getExtremeHash(
  gameFolder: string,
  alternativeRelativeExe?: string,
) {
  return getGameExeHashWithFallback(
    getExtremePath,
    gameFolder,
    alternativeRelativeExe,
  );
}
