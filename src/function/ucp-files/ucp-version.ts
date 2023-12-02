import { loadYaml, Error, resolvePath } from 'tauri/tauri-files';
import Result from 'util/structs/result';
import Option from 'util/structs/option';
import { getPropertyIfExistsAndTypeOf } from 'util/scripts/util';
import { UCP_VERSION_FILE } from 'function/global/constants/file-constants';
import { atom } from 'jotai';
import { GAME_FOLDER_ATOM } from 'function/global/global-atoms';
import { atomWithRefresh } from 'hooks/jotai/base';
import Logger from 'util/scripts/logging';

const LOGGER = new Logger('ucp-version.ts');
export interface UCPVersionInterface {
  major: Option<number>;
  minor: Option<number>;
  patch: Option<number>;
  sha: Option<string>;
  build: Option<string>;
}

export class UCPVersion implements UCPVersionInterface {
  major: Option<number>;

  minor: Option<number>;

  patch: Option<number>;

  sha: Option<string>;

  build: Option<string>;

  static #getVersionNumAsString(numOption: Option<number>): string | '?' {
    return numOption.map((num) => num.toString()).getOrElse('?');
  }

  getMajorAsString(): string | '?' {
    return UCPVersion.#getVersionNumAsString(this.major);
  }

  getMinorAsString(): string | '?' {
    return UCPVersion.#getVersionNumAsString(this.minor);
  }

  getPatchAsString(): string | '?' {
    return UCPVersion.#getVersionNumAsString(this.patch);
  }

  getShaRepresentation(): string | '!' {
    return this.sha.map((sha) => sha.substring(0, 8)).getOrElse('!');
  }

  getBuildRepresentation(): string | '?' {
    return this.build.getOrElse('?');
  }

  constructor(object?: Record<string, unknown>) {
    const isObject = object && typeof object === 'object';
    this.major = isObject
      ? getPropertyIfExistsAndTypeOf(object, 'major', 'number')
      : Option.ofEmpty();
    this.minor = isObject
      ? getPropertyIfExistsAndTypeOf(object, 'minor', 'number')
      : Option.ofEmpty();
    this.patch = isObject
      ? getPropertyIfExistsAndTypeOf(object, 'patch', 'number')
      : Option.ofEmpty();
    this.sha = isObject
      ? getPropertyIfExistsAndTypeOf(object, 'sha', 'string')
      : Option.ofEmpty();
    this.build = isObject
      ? getPropertyIfExistsAndTypeOf(object, 'build', 'string')
      : Option.ofEmpty();
  }

  toString(): string {
    return `${this.getMajorAsString()}.${this.getMinorAsString()}.${this.getPatchAsString()} - ${this.getShaRepresentation()} - ${this.getBuildRepresentation()}`;
  }
}

async function getUCPVersionFilePath(gameFolder: string) {
  if (!gameFolder) {
    return '';
  }

  return resolvePath(gameFolder, UCP_VERSION_FILE);
}

const UCP_VERSION_FILE_PATH_ATOM = atom((get) =>
  getUCPVersionFilePath(get(GAME_FOLDER_ATOM)),
);

export const UCP_VERSION_ATOM = atomWithRefresh(async (get) => {
  const path = await get(UCP_VERSION_FILE_PATH_ATOM);
  if (!path) {
    return new UCPVersion();
  }
  return (await loadYaml(path)).consider(
    (yaml) => new UCPVersion(yaml),
    (err) => {
      LOGGER.obj(err).warn();
      return new UCPVersion();
    },
  );
});
