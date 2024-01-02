import { loadYaml, Error, resolvePath } from 'tauri/tauri-files';
import Result from 'util/structs/result';
import Option from 'util/structs/option';
import { getPropertyIfExistsAndTypeOf } from 'util/scripts/util';
import { UCP_VERSION_FILE } from 'function/global/constants/file-constants';
import { atom } from 'jotai';
import { GAME_FOLDER_INTERFACE_ASYNC_ATOM } from 'function/game-folder/state';
import { atomWithRefresh, getStore } from 'hooks/jotai/base';
import Logger from 'util/scripts/logging';
import { showModalOk } from 'components/modals/modal-ok';
import { INIT_ERROR } from 'function/game-folder/initialization';

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
    let br = this.getBuildRepresentation();
    if (br.length === 0) {
      br = '';
    } else {
      br = ` - ${br}`;
    }
    return `${this.getMajorAsString()}.${this.getMinorAsString()}.${this.getPatchAsString()} - ${this.getShaRepresentation()}${br}`;
  }
}

async function getUCPVersionFilePath(gameFolder: string) {
  if (!gameFolder) {
    return '';
  }

  return resolvePath(gameFolder, UCP_VERSION_FILE);
}

const UCP_VERSION_FILE_PATH_ATOM = atom((get) =>
  getUCPVersionFilePath(get(GAME_FOLDER_INTERFACE_ASYNC_ATOM)),
);

export type UCPVersionFileProcessResult = {
  version: UCPVersion;
  status: 'ok' | 'warning' | 'error';
  messages: string[];
  errorCode?: 1 | 2 | 3;
};

export const UCP_VERSION_ATOM = atomWithRefresh(async (get) => {
  const path = await get(UCP_VERSION_FILE_PATH_ATOM);
  if (!path) {
    return {
      version: new UCPVersion(),
      status: 'error',
      errorCode: 2,
      messages: ['path is not defined'],
    } as UCPVersionFileProcessResult;
  }
  return (await loadYaml(path)).consider(
    async (yaml) =>
      ({
        version: new UCPVersion(yaml),
        status: 'ok',
      }) as UCPVersionFileProcessResult,
    async (err) => {
      LOGGER.obj(err).warn();
      let errorCode = 0;
      const messages: string[] = [];
      if (
        (err as object)
          .toString()
          .startsWith('path not allowed on the configured scope: ')
      ) {
        const msg = `Cannot access file ${path}, please check security permissions`;
        messages.push(msg);
        errorCode = 1;

        LOGGER.obj(msg).error();

        if (!getStore().get(INIT_ERROR)) getStore().set(INIT_ERROR, true);
      } else if ((err as object).toString().endsWith('(os error 3)')) {
        const msg = `File ${path} does not exist`;
        messages.push(msg);
        errorCode = 3;

        if (!getStore().get(INIT_ERROR)) getStore().set(INIT_ERROR, true);
        // No point in showing this, the user is probably aware since the most likely cause is that UCP isn't installed
        // await showModalOk({
        //   title: 'File read error',
        //   message: msg,
        // });
      }
      return {
        version: new UCPVersion(),
        status: 'error',
        errorCode,
        messages,
      } as UCPVersionFileProcessResult;
    },
  );
});
