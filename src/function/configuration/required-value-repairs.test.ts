import { describe, expect, test } from 'vitest';
import {
  applyRequiredValueRepairs,
  findRequiredValueRepairs,
} from './required-value-repairs';

const locks = {
  'legacy.keys': { lockedBy: 'hotkeys', lockedValue: false },
  'legacy.speed': { lockedBy: 'preset', lockedValue: 0 },
  'legacy.name': { lockedBy: 'preset', lockedValue: '' },
};

describe('required value repairs', () => {
  test('lists only saved preferences that differ from the required value', () => {
    expect(
      findRequiredValueRepairs(
        {
          'legacy.keys': true,
          'legacy.speed': 0,
          'legacy.name': 'old',
          'legacy.other': 5,
        },
        locks,
      ),
    ).toEqual([
      {
        url: 'legacy.keys',
        before: true,
        after: false,
        lockedBy: 'hotkeys',
      },
      { url: 'legacy.name', before: 'old', after: '', lockedBy: 'preset' },
    ]);
  });

  test('treats false, 0 and empty string as distinct real values', () => {
    expect(
      findRequiredValueRepairs(
        { 'legacy.keys': 0, 'legacy.speed': false, 'legacy.name': 0 },
        locks,
      ).map(({ url }) => url),
    ).toEqual(['legacy.keys', 'legacy.name', 'legacy.speed']);
  });

  test('stores the required value and keeps unrelated preferences', () => {
    expect(
      applyRequiredValueRepairs(
        { 'legacy.keys': true, 'legacy.other': 5 },
        locks,
      ),
    ).toEqual({ 'legacy.keys': false, 'legacy.other': 5 });
  });

  test('does not add a preference the user never saved', () => {
    expect(applyRequiredValueRepairs({}, locks)).toEqual({});
  });
});
