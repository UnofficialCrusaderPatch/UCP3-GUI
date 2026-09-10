import { describe, expect, it } from 'vitest';
import { Range } from 'semver';
import { Extension } from '../../config/ucp/common';
import { ContentStore, ExtensionContent } from '../content/store/fetch';
import { planBundledUpdates } from './plan-bundled-updates';

function local(
  name: string,
  version: string,
  dependencies: Record<string, string> = {},
) {
  return {
    name,
    version,
    definition: {
      dependencies: Object.fromEntries(
        Object.entries(dependencies).map(([n, v]) => [n, new Range(v)]),
      ),
    },
  } as Extension;
}
function online(
  name: string,
  version: string,
  dependencies: Record<string, string> = {},
) {
  return {
    definition: { name, version, dependencies, type: 'module' },
    contents: { package: [{ method: 'github-binary', signature: 'signed' }] },
  } as ExtensionContent;
}
function catalog(list: ExtensionContent[]) {
  return {
    framework: { version: '=3.0.7' },
    frontend: { version: '>=1.0.0' },
    extensions: { list },
  } as ContentStore;
}
describe('fresh-install dependency planning', () => {
  it('follows new store releases semantically, without installing unrelated content', () => {
    const bundled = [local('aiSwapper', '1.1.0')];
    const store = catalog([
      online('aiSwapper', '1.3.0'),
      online('aiSwapper', '1.10.0'),
      online('unrelated', '1.0.0'),
    ]);
    expect(
      planBundledUpdates(bundled, store, '1.0.15', '3.0.7').map(
        (e) => e.definition.version,
      ),
    ).toEqual(['1.10.0']);
  });
  it('resolves added dependencies and falls back from incompatible releases', () => {
    const store = catalog([
      online('aiSwapper', '1.3.0', { helper: '^1.0.0' }),
      online('aiSwapper', '2.0.0', { framework: '>=3.1.0' }),
      online('helper', '1.0.0'),
    ]);
    expect(
      planBundledUpdates(
        [local('aiSwapper', '1.1.0')],
        store,
        '1.0.15',
        '3.0.7',
      ).map((e) => `${e.definition.name}@${e.definition.version}`),
    ).toEqual(['aiSwapper@1.3.0', 'helper@1.0.0']);
  });
  it('respects constraints from bundled plugins', () => {
    const bundled = [
      local('aiSwapper', '1.1.0'),
      local('preset', '1.0.0', { aiSwapper: '<1.3.0' }),
    ];
    expect(
      planBundledUpdates(
        bundled,
        catalog([online('aiSwapper', '1.3.0')]),
        '1.0.15',
        '3.0.7',
      ),
    ).toEqual([]);
  });
  it('keeps newer local versions and skips prereleases and unsigned modules', () => {
    const unsigned = online('aiSwapper', '3.0.0');
    unsigned.contents.package = [{ method: 'github-binary' } as never];
    expect(
      planBundledUpdates(
        [local('aiSwapper', '1.3.0')],
        catalog([
          online('aiSwapper', '1.2.1'),
          online('aiSwapper', '2.0.0-beta.1'),
          unsigned,
        ]),
        '1.0.15',
        '3.0.7',
      ),
    ).toEqual([]);
  });
  it('rejects catalogs for a different framework', () => {
    expect(() =>
      planBundledUpdates([], catalog([]), '1.0.15', '3.0.6'),
    ).toThrow('incompatible');
  });
});
