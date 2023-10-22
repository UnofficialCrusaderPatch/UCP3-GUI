import Option from 'util/structs/option';

import VERSIONS_JSON from './game-version.json';

// maps known hashes to known game versions
const GAME_VERSIONS: Record<string, GameVersion> = {};

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
  sha: string;
}

class GameVersion implements GameVersionInterface {
  type: GameTypeEnum;

  name: Option<string>;

  region: Option<string>;

  major: Option<number>;

  minor: Option<number>;

  patch: Option<number>;

  sha: string;

  constructor(
    type: GameTypeEnum,
    sha: string,
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

    // adding to global versions
    GAME_VERSIONS[sha] = this;
  }

  static ofUnknown(sha: string) {
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

// adding actual game hashes:
Object.entries(VERSIONS_JSON).forEach((entry) => {
  const sha = entry[0];
  const { type, name, region, major, minor, patch } = entry[1];
  const realType =
    type in GameType ? GameType[type as GameTypeEnum] : GameType.UNKNOWN;
  GameVersion.of(realType, sha, name, region, major, minor, patch);
});

export type GameVersionInstance = GameVersion;

export const EMPTY_GAME_VERSION: GameVersionInstance =
  GameVersion.ofUnknown('');

export function getGameVersionForHash(sha: string): GameVersionInstance {
  return GAME_VERSIONS[sha] ?? GameVersion.ofUnknown(sha);
}
