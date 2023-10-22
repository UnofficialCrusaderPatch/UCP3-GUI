import { getHexHashOfFile } from 'util/scripts/hash';
import Logger from 'util/scripts/logging';
import Option from 'util/structs/option';

const LOGGER = new Logger('game-hash.ts');

export default async function getGameExeHash(
  exePath: string,
): Promise<Option<string>> {
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
