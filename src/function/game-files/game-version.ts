import { Atom, atom } from 'jotai';
import Option from '../../util/structs/option';
import { loadYaml, resolveResourcePath } from '../../tauri/tauri-files';
import Logger from '../../util/scripts/logging';
import {
  GAME_INFO_DIRECTORY,
  GAME_VERSION_FILE,
} from '../global/constants/file-constants';
import { getStore } from '../../hooks/jotai/base';

const LOGGER = new Logger('game-version.ts');

type GameVersionFileEntry = {
  type: string;
  name: string;
  region: string;
  major: number;
  minor: number;
  patch: number;
};

type SHA = string;

type GameVersionFile = Record<SHA, GameVersionFileEntry>;

const GameType = {
  UNKNOWN: 'UNKNOWN',
  VANILLA: 'VANILLA',
  EXTREME: 'EXTREME',
} as const;

type GameTypeEnum = (typeof GameType)[keyof typeof GameType];

interface GameVersionInterface {
  type: GameTypeEnum;
  name: Option<string>; // some name given to it
  region: Option<string>; // some region or language associated with it
  major: Option<number>;
  minor: Option<number>;
  patch: Option<number>;
  sha: SHA;
}

class GameVersion implements GameVersionInterface {
  type: GameTypeEnum;

  name: Option<string>;

  region: Option<string>;

  major: Option<number>;

  minor: Option<number>;

  patch: Option<number>;

  sha: SHA;

  constructor(
    type: GameTypeEnum,
    sha: SHA,
    name?: string,
    region?: string,
    major?: number,
    minor?: number,
    patch?: number,
  ) {
    this.type = type;
    this.sha = sha;
    this.name = Option.ofNullable(name);
    this.region = Option.ofNullable(region);
    this.major = Option.ofNullable(major);
    this.minor = Option.ofNullable(minor);
    this.patch = Option.ofNullable(patch);
  }

  static ofUnknown(sha: SHA) {
    return this.of(GameType.UNKNOWN, sha);
  }

  static of(...args: ConstructorParameters<typeof GameVersion>) {
    return new GameVersion(...args);
  }

  static #getVersionNumAsString(numOption: Option<number>): string | '?' {
    return numOption.map((num) => num.toString()).getOrElse('?');
  }

  getMajorAsString(): string | '?' {
    return GameVersion.#getVersionNumAsString(this.major);
  }

  getMinorAsString(): string | '?' {
    return GameVersion.#getVersionNumAsString(this.minor);
  }

  getPatchAsString(): string | '?' {
    return GameVersion.#getVersionNumAsString(this.patch);
  }

  getShaRepresentation(): string {
    return this.sha.substring(0, 8);
  }

  getDescriptionString(): string | 'Unknown' {
    return this.name
      .map((name) =>
        this.region.isPresent() ? `${name} - ${this.region.get()}` : name,
      )
      .getOrElse('Unknown');
  }

  toString(): string {
    return `${this.getDescriptionString()} - ${this.getMajorAsString()}.${this.getMinorAsString()}.${this.getPatchAsString()} - ${this.getShaRepresentation()}`;
  }
}

const GAME_VERSION_ATOM: Atom<Promise<Record<SHA, GameVersion>>> = atom(
  async () => {
    const versionData: GameVersionFile = await resolveResourcePath([
      GAME_INFO_DIRECTORY,
      GAME_VERSION_FILE,
    ])
      .then(loadYaml)
      .then((res) => res.getOrThrow())
      .catch((err) => {
        LOGGER.msg('Failed to load game versions file: {}', err).error();
        return {};
      });

    // adding actual game hashes:
    const res: Record<SHA, GameVersion> = {};
    Object.entries(versionData).forEach(([sha, versionEntry]) => {
      const { type } = versionEntry;
      const realType =
        type in GameType ? GameType[type as GameTypeEnum] : GameType.UNKNOWN;
      res[sha] = GameVersion.of(
        realType,
        sha,
        versionEntry.name,
        versionEntry.region,
        versionEntry.major,
        versionEntry.minor,
        versionEntry.patch,
      );
    });
    return res;
  },
);

export type GameVersionInstance = GameVersion;

export const EMPTY_GAME_VERSION: GameVersionInstance =
  GameVersion.ofUnknown('');

export async function getGameVersionForHash(
  sha: string,
): Promise<GameVersionInstance> {
  return (
    (await getStore().get(GAME_VERSION_ATOM))[sha] ?? GameVersion.ofUnknown(sha)
  );
}
