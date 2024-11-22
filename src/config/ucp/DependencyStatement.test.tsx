import { describe, expect, test } from 'vitest';
import {
  DependencyStatement,
  Version,
  VersionRange,
} from './dependency-statement';

const dep1 = DependencyStatement.fromString('test >= 1.0.0');
const dep2 = DependencyStatement.fromString('test < 2.0.0');
const dep3 = DependencyStatement.fromString('test > 1.0.5');

const test1Result = dep1
  .getAllowedVersionRange()
  .update(dep2.getAllowedVersionRange())
  .update(dep3.getAllowedVersionRange());

describe('test 1', () => {
  test('that dep3 is a thing', () => {
    expect(test1Result).toEqual(
      new VersionRange({
        minimum: Version.fromString('1.0.5'),
        maximum: Version.fromString('2.0.0'),
        exact: undefined,
        not: undefined,
        minimumInclusive: false,
        maximumInclusive: false,
      }),
    );
  });
});

const test2A = test1Result.isInRange(Version.fromString('1.1.0'));
const test2B = test1Result.isInRange(Version.fromString('0.0.1'));

describe('test 2', () => {
  test('that version range testing works', () => {
    expect(test2A === true && test2B !== true).toBe(true);
  });
});
