/* eslint-disable max-classes-per-file */

const MATCHER = /^([a-zA-Z0-9-_]+)\s*([<>=]+)\s*([0-9.]+)$/;
const MATCHER_SIMPLE = /^([a-zA-Z0-9-_]+)$/;
const MATCHER_SIMPLE_HEAD = /^([a-zA-Z0-9-_]+)/;

const VERSION_MATCHER = /([0-9]+)\.([0-9]+)\.([0-9]+)/;

class Version {
  major: number;

  minor: number;

  patch: number;

  constructor(major: number, minor: number, patch: number) {
    this.major = major;
    this.minor = minor;
    this.patch = patch;
  }

  static fromString(x: string): Version {
    const match = VERSION_MATCHER.exec(x);
    if (match !== null) {
      return new Version(
        parseInt(match[1], 10),
        parseInt(match[2], 10),
        parseInt(match[3], 10),
      );
    }

    throw new Error(`misspecified version: {x}`);
  }

  toString() {
    return `${this.major}.${this.minor}.${this.patch}`;
  }

  compare(b: Version) {
    if (this.major < b.major) {
      return -1;
    }
    if (this.major === b.major) {
      if (this.minor < b.minor) {
        return -1;
      }
      if (this.minor === b.minor) {
        if (this.patch < b.patch) {
          return -1;
        }
        if (this.patch === b.patch) {
          return 0;
        }
        return 1;
      }
      return 1;
    }
    return 1;
  }
}

const VERSION_OPERATORS: {
  [key: string]: (a: Version, b: Version) => boolean;
} = {
  '>': (a: Version, b: Version) => a.compare(b) === 1,
  '<': (a: Version, b: Version) => a.compare(b) === -1,
  '>=': (a: Version, b: Version) => a.compare(b) === 1 || a.compare(b) === 0,
  '<=': (a: Version, b: Version) => a.compare(b) === -1 || a.compare(b) === 0,
  '==': (a: Version, b: Version) => a.compare(b) === 0,
  '!=': (a: Version, b: Version) => a.compare(b) !== 0,
};

class VersionRange {
  minimum: Version | undefined;

  maximum: Version | undefined;

  exact: Version | undefined;

  not: Version | undefined;

  minimumInclusive: boolean;

  maximumInclusive: boolean;

  constructor({
    minimum,
    maximum,
    exact,
    not,
    minimumInclusive,
    maximumInclusive,
  }: {
    minimum: Version | undefined;
    maximum: Version | undefined;
    exact: Version | undefined;
    not: Version | undefined;
    minimumInclusive: boolean;
    maximumInclusive: boolean;
  }) {
    this.minimum = minimum;
    this.maximum = maximum;
    this.exact = exact;
    this.not = not;
    this.minimumInclusive = minimumInclusive;
    this.maximumInclusive = maximumInclusive;
  }

  isInRange(o: Version) {
    if (this.minimum !== undefined) {
      const op = this.minimumInclusive ? '>=' : '>';
      if (!VERSION_OPERATORS[op](o, this.minimum)) {
        return false;
      }
    }
    if (this.maximum !== undefined) {
      const op = this.maximumInclusive ? '<=' : '<';
      if (!VERSION_OPERATORS[op](o, this.maximum)) {
        return false;
      }
    }
    if (this.exact !== undefined) {
      if (!VERSION_OPERATORS['=='](this.exact, o)) {
        return false;
      }
    }
    if (this.not !== undefined) {
      if (!VERSION_OPERATORS['!='](this.not, o)) {
        return false;
      }
    }
    return true;
  }

  update(o: VersionRange) {
    let newMinimum;
    let newMaximum;
    if (o.exact !== undefined) {
      if (this.exact !== undefined) {
        if (VERSION_OPERATORS['!='](this.exact, o.exact)) {
          throw new Error('version not the exact same');
        }
      }
      if (this.minimum !== undefined) {
        const op = this.minimumInclusive === true ? '<' : '<=';
        if (VERSION_OPERATORS[op](o.exact, this.minimum)) {
          throw new Error('version is too low');
        }
        newMinimum = o.exact;
      }
      if (this.maximum !== undefined) {
        const op = this.maximumInclusive === true ? '>' : '>=';
        if (VERSION_OPERATORS[op](o.exact, this.maximum)) {
          throw new Error('version is too high');
        }
        newMaximum = o.exact;
      }
      return new VersionRange({
        minimum: undefined,
        maximum: undefined,
        exact: o.exact,
        not: undefined,
        minimumInclusive: false,
        maximumInclusive: false,
      });
    }
    if (o.minimum !== undefined) {
      if (this.exact !== undefined) {
        if (VERSION_OPERATORS['!='](this.exact, o.minimum)) {
          throw new Error('version not the exact same');
        }
      }
      if (this.minimum !== undefined) {
        // this.minimumInclusive or o.minimumInclusive or either?
        const op = this.minimumInclusive === true ? '<' : '<=';
        if (VERSION_OPERATORS[op](o.minimum, this.minimum)) {
          throw new Error('version has too low minimum');
        }
      }
      if (this.maximum !== undefined) {
        const op = this.maximumInclusive === true ? '>' : '>=';
        if (VERSION_OPERATORS[op](o.minimum, this.maximum)) {
          throw new Error('version has too high minimum');
        }
      }
      newMinimum = o.minimum;
    }
    if (o.maximum !== undefined) {
      if (this.exact !== undefined) {
        if (VERSION_OPERATORS['!='](this.exact, o.maximum)) {
          throw new Error('version not the exact same');
        }
      }
      if (this.minimum !== undefined) {
        // this.minimumInclusive or o.minimumInclusive or either?
        const op = this.minimumInclusive === true ? '<' : '<=';
        if (VERSION_OPERATORS[op](o.maximum, this.minimum)) {
          throw new Error('version has too low maximum');
        }
      }
      if (this.maximum !== undefined) {
        const op = this.maximumInclusive === true ? '>' : '>=';
        if (VERSION_OPERATORS[op](o.maximum, this.maximum)) {
          throw new Error('version has too high maximum');
        }
      }
      newMaximum = o.maximum;
    }
    if (newMinimum !== undefined && newMaximum !== undefined) {
      if (
        VERSION_OPERATORS['>'](newMinimum, newMaximum) ||
        (VERSION_OPERATORS['=='](newMinimum, newMaximum) &&
          (!o.minimumInclusive || !o.maximumInclusive))
      ) {
        throw new Error('no possible versions left in range');
      }
    }
    return new VersionRange({
      minimum: newMinimum || this.minimum,
      maximum: newMaximum || this.maximum,
      exact: this.exact,
      not: this.not,
      minimumInclusive: o.minimumInclusive,
      maximumInclusive: o.maximumInclusive,
    });
  }
}

class DependencyStatement {
  extension: string;

  version: Version;

  operator: string;

  constructor(extension: string, operator: string, version: string) {
    this.extension = extension;
    this.version =
      version === '' ? new Version(0, 0, 0) : Version.fromString(version);
    this.operator = operator === '' ? '>=' : operator;
  }

  static fromString(x: string): DependencyStatement {
    const matches = MATCHER.exec(x);
    if (matches !== null) {
      return new DependencyStatement(matches[1], matches[2], matches[3]);
    }
    const matchesSimple = MATCHER_SIMPLE.exec(x);
    if (matchesSimple !== null) {
      return new DependencyStatement(matchesSimple[1], '', '');
    }

    const matchesSimpleHead = MATCHER_SIMPLE_HEAD.exec(x);
    if (matchesSimpleHead !== null) {
      // try {
      //   const range = new semver.Range(x.split(matchesSimpleHead[1])[1], {loose: true})
      //   return new DependencyStatement(matchesSimpleHead[1], range.range, '');
      // }

      return new DependencyStatement(matchesSimpleHead[1], '>=', '0.0.0');
    }

    throw new Error(`could not parse dependency string: ${x}`);
  }

  toString() {
    return `${this.extension} ${this.operator} ${this.version.toString()}`;
  }

  // The utility of this function is to detect if the available options is reduced to length 0.
  // Because that means two dependency configurations are not compatible
  filterAllowedVersions(options: Version[]) {
    return [...options].filter(
      (v) => VERSION_OPERATORS[this.operator](this.version, v) === true,
    );
  }

  getAllowedVersionRange(): VersionRange {
    if (this.operator === '>') {
      return new VersionRange({
        minimum: this.version,
        minimumInclusive: false,
        maximum: undefined,
        maximumInclusive: false,
        exact: undefined,
        not: undefined,
      });
    }
    if (this.operator === '>=') {
      return new VersionRange({
        minimum: this.version,
        minimumInclusive: true,
        maximum: undefined,
        maximumInclusive: false,
        exact: undefined,
        not: undefined,
      });
    }
    if (this.operator === '<') {
      return new VersionRange({
        minimum: undefined,
        minimumInclusive: false,
        maximum: this.version,
        maximumInclusive: false,
        exact: undefined,
        not: undefined,
      });
    }
    if (this.operator === '<=') {
      return new VersionRange({
        minimum: undefined,
        minimumInclusive: false,
        maximum: this.version,
        maximumInclusive: true,
        exact: undefined,
        not: undefined,
      });
    }
    if (this.operator === '==') {
      return new VersionRange({
        minimum: undefined,
        minimumInclusive: false,
        maximum: undefined,
        maximumInclusive: false,
        exact: this.version,
        not: undefined,
      });
    }
    if (this.operator === '!=') {
      return new VersionRange({
        minimum: undefined,
        minimumInclusive: false,
        maximum: undefined,
        maximumInclusive: false,
        exact: undefined,
        not: this.version,
      });
    }

    return new VersionRange({
      minimumInclusive: false,
      maximumInclusive: false,
      minimum: undefined,
      maximum: undefined,
      exact: undefined,
      not: undefined,
    });
  }
}

export { DependencyStatement, Version, VersionRange };
