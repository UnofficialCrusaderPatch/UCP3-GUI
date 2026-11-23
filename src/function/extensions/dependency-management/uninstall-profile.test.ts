import { describe, expect, test } from 'vitest';
import { parse } from 'yaml';
import { ConfigFile } from '../../../config/ucp/common';
import { profileUsedExtensionIDs } from './uninstall';

const ids = ['a@1.0.0'];
const config = (yaml: string) => parse(yaml) as ConfigFile;

describe('profileUsedExtensionIDs', () => {
  test('lists the IDs of both load orders', () => {
    const used = profileUsedExtensionIDs(
      config(`
config-full:
  load-order:
    - { extension: b, version: 2.0.0 }
config-sparse:
  load-order:
    - { extension: c, version: 3.0.0 }
`),
      ids,
    );
    expect([...used]).toEqual(['b@2.0.0', 'c@3.0.0']);
  });

  test('a valid empty full order uses nothing', () => {
    expect(
      profileUsedExtensionIDs(config('config-full:\n  load-order: []\n'), ids)
        .size,
    ).toBe(0);
  });

  test.each([
    ['a missing full order', 'config-sparse:\n  load-order: []\n'],
    ['a null full order', 'config-full:\n  load-order: null\n'],
    ['a bare full order key', 'config-full:\n  load-order:\n'],
    [
      'a null sparse order',
      'config-full:\n  load-order: []\nconfig-sparse:\n  load-order: null\n',
    ],
    ['an invalid entry', 'config-full:\n  load-order: [42]\n'],
  ])('%s counts as using every ID', (_, yaml) => {
    expect([...profileUsedExtensionIDs(config(yaml), ids)]).toEqual(ids);
  });
});
