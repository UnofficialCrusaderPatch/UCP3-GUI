import { loadYaml, Error } from 'tauri/tauri-files';
import Result from 'util/structs/result';
import Option from 'util/structs/option';
import { getPropertyIfExistsAndTypeOf } from 'util/scripts/util';

export interface UCPVersion {
  major: Option<number>;
  minor: Option<number>;
  patch: Option<number>;
  sha: Option<string>;
  build: Option<string>;
}

export class UCPVersion {
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

export function getEmptyUCPVersion(): UCPVersion {
  return new UCPVersion();
}

export async function loadUCPVersion(
  gameFolder: string
): Promise<Result<UCPVersion, Error>> {
  const path = `${gameFolder}/ucp-version.yml`;
  return (await loadYaml(path)).mapOk((yaml) => new UCPVersion(yaml));
}
