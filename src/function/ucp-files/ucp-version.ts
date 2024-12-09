import { atom } from 'jotai';
import { INIT_ERROR } from '../game-folder/initialization/initialization-states';
import { loadYaml } from '../../tauri/tauri-files';
import Option from '../../util/structs/option';
import { getPropertyIfExistsAndTypeOf } from '../../util/scripts/util';
import { UCP_VERSION_FILE } from '../global/constants/file-constants';
import { getStore } from '../../hooks/jotai/base';
import Logger from '../../util/scripts/logging';

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

  getMajorMinorPatchAsString() {
    return `${this.getMajorAsString()}.${this.getMinorAsString()}.${this.getPatchAsString()}`;
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

  get isValidForSemanticVersioning() {
    return (
      this.major.isPresent() && this.minor.isPresent() && this.patch.isPresent()
    );
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
    let tail = [this.getShaRepresentation(), this.getBuildRepresentation()]
      .filter((el) => el !== undefined && el.length > 0)
      .join(' - ');
    if (tail.length > 0) {
      tail = ` - ${tail}`;
    }
    return `${this.getMajorAsString()}.${this.getMinorAsString()}.${this.getPatchAsString()}${tail}`;
  }
}

export type UCPVersionFileProcessResult = {
  version: UCPVersion;
  status: 'ok' | 'warning' | 'error';
  messages: string[];
  errorCode?: 1 | 2 | 3;
};

export const UCP_VERSION_ATOM = atom<UCPVersionFileProcessResult>({
  version: new UCPVersion(),
} as UCPVersionFileProcessResult);

export const initializeUCPVersion = async (gameFolder: string) => {
  if (!gameFolder) {
    getStore().set(UCP_VERSION_ATOM, {
      version: new UCPVersion(),
      status: 'error',
      errorCode: 2,
      messages: ['path is not defined'],
    } as UCPVersionFileProcessResult);
  }
  const path = `${gameFolder}/${UCP_VERSION_FILE}`;
  (await loadYaml(path)).consider(
    async (yaml) => {
      getStore().set(UCP_VERSION_ATOM, {
        version: new UCPVersion(yaml),
        status: 'ok',
      } as UCPVersionFileProcessResult);
    },

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
        // showModalOk({
        //   title: 'File read error',
        //   message: msg,
        // });
      }
      getStore().set(UCP_VERSION_ATOM, {
        version: new UCPVersion(),
        status: 'error',
        errorCode,
        messages,
      } as UCPVersionFileProcessResult);
    },
  );
};

export type SimplifiedFrameworkVersion = {
  version: string;
  sha: string;
  type: 'Developer' | 'Release';
};

export const UCP_SIMPLIFIED_VERSION_ATOM = atom<SimplifiedFrameworkVersion>(
  (get) => {
    const vr = get(UCP_VERSION_ATOM);
    let version = '0.0.0';
    let sha = '';
    let type: 'Release' | 'Developer' = 'Release';
    if (vr.status === 'ok') {
      version = `${vr.version.getMajorAsString()}.${vr.version.getMinorAsString()}.${vr.version.getPatchAsString()}`;
      sha = vr.version!.sha.getOrElse('!');
      type =
        vr.version.getBuildRepresentation() === 'Developer'
          ? 'Developer'
          : type;

      return {
        version,
        sha,
        type,
      } as SimplifiedFrameworkVersion;
    }

    return {
      version: '0.0.0',
      sha: '',
      type: 'Release',
    };
  },
);
