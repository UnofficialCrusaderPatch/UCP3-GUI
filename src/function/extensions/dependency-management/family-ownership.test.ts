import { describe, expect, it } from 'vitest';
import { ConfigFile, Extension } from '../../../config/ucp/common';
import {
  acceptFamilyMemberships,
  findProfileFamilyConflicts,
  withAcceptedFamilies,
  withoutProfileMembers,
} from './families';

type Declared = {
  name: string;
  type?: 'plugin' | 'module';
  author?: string;
  family?: unknown;
  configEntries?: Record<string, unknown>;
  version?: string;
};

function ext({
  name,
  type = 'plugin',
  author = 'Author A',
  family,
  configEntries = {},
  version = '1.0.0',
}: Declared) {
  return {
    name,
    version,
    type,
    configEntries,
    definition: {
      name,
      version,
      type,
      author,
      dependencies: {},
      ...(family === undefined ? {} : { family }),
    },
  } as unknown as Extension;
}

const familyOf = (
  items: Extension[],
  result: ReturnType<typeof acceptFamilyMemberships>,
  name: string,
) => result.accepted.get(items.find((item) => item.name === name)!);

describe('family ownership', () => {
  it('accepts the root and plugins by the same author', () => {
    const items = [
      ext({ name: 'Bare', family: [{ name: 'ai', root: true }] }),
      ext({ name: 'Applied', author: ' author a ', family: [{ name: 'ai' }] }),
    ];
    const result = acceptFamilyMemberships(items);
    expect(familyOf(items, result, 'Bare')).toEqual([
      { name: 'ai', root: true },
    ]);
    expect(familyOf(items, result, 'Applied')).toEqual([{ name: 'ai' }]);
    expect(result.warnings).toEqual([]);
  });

  it('accepts a member the root lists, whatever its author', () => {
    const items = [
      ext({
        name: 'Bare',
        family: [{ name: 'ai', root: true, members: ['Guest'] }],
      }),
      ext({ name: 'Guest', author: 'Author B', family: [{ name: 'ai' }] }),
    ];
    expect(familyOf(items, acceptFamilyMemberships(items), 'Guest')).toEqual([
      { name: 'ai' },
    ]);
  });

  it('ignores a self-declared member that the root does not accept, with a warning', () => {
    const items = [
      ext({ name: 'Bare', family: [{ name: 'ai', root: true }] }),
      ext({ name: 'Intruder', author: 'Author B', family: [{ name: 'ai' }] }),
    ];
    const result = acceptFamilyMemberships(items);
    expect(familyOf(items, result, 'Intruder')).toEqual([]);
    expect(result.warnings).toEqual([
      "Intruder: family 'ai' ignored, the root Bare neither lists it as a member nor has the same author.",
    ]);
  });

  it('never accepts modules, as members or as roots', () => {
    const items = [
      ext({ name: 'Bare', family: [{ name: 'ai', root: true }] }),
      ext({ name: 'Code', type: 'module', family: [{ name: 'ai' }] }),
      ext({
        name: 'Fixes',
        type: 'module',
        family: [{ name: 'fixes', root: true }],
      }),
      ext({ name: 'FixesPreset', family: [{ name: 'fixes' }] }),
    ];
    const result = acceptFamilyMemberships(items);
    expect(familyOf(items, result, 'Code')).toEqual([]);
    expect(familyOf(items, result, 'Fixes')).toEqual([]);
    expect(familyOf(items, result, 'FixesPreset')).toEqual([]);
    expect(result.warnings).toContain(
      "Code: family 'ai' ignored, only plugins can be family members.",
    );
    expect(result.warnings).toContain(
      "FixesPreset: family 'fixes' ignored, its root is a module.",
    );
  });

  it('ignores families without exactly one root plugin name', () => {
    const items = [
      ext({ name: 'Orphan', family: [{ name: 'none' }] }),
      ext({ name: 'RootA', family: [{ name: 'two', root: true }] }),
      ext({ name: 'RootB', family: [{ name: 'two', root: true }] }),
      ext({
        name: 'Root',
        version: '1.0.0',
        family: [{ name: 'one', root: true }],
      }),
      ext({
        name: 'Root',
        version: '1.1.0',
        family: [{ name: 'one', root: true }],
      }),
    ];
    const result = acceptFamilyMemberships(items);
    expect(result.accepted.get(items[0])).toEqual([]);
    expect(result.accepted.get(items[1])).toEqual([]);
    expect(result.accepted.get(items[2])).toEqual([]);
    expect(result.accepted.get(items[3])).toEqual([
      { name: 'one', root: true },
    ]);
    expect(result.accepted.get(items[4])).toEqual([
      { name: 'one', root: true },
    ]);
  });

  it('returns filtered copies and leaves the input unchanged', () => {
    const intruder = ext({
      name: 'Intruder',
      author: 'Author B',
      family: [{ name: 'ai' }],
    });
    const items = [
      ext({ name: 'Bare', family: [{ name: 'ai', root: true }] }),
      intruder,
    ];
    const {
      items: [, copy],
      warnings,
    } = withAcceptedFamilies(items);
    expect(warnings).toHaveLength(1);
    expect(copy.definition.family).toEqual([]);
    expect(intruder.definition.family).toEqual([{ name: 'ai' }]);
  });
});

function profile(explicit: string[], full?: string[]): ConfigFile {
  const order = (names: string[]) =>
    names.map((name) => ({ extension: name, version: '1.0.0' }));
  return {
    meta: { version: '1.0.0' },
    'config-sparse': {
      modules: {},
      plugins: {},
      'load-order': order(explicit),
    },
    ...(full
      ? {
          'config-full': {
            modules: {},
            plugins: {},
            'load-order': order(full),
          },
        }
      : {}),
  } as unknown as ConfigFile;
}

describe('saved profiles that select two family members', () => {
  const bare = ext({ name: 'Bare', family: [{ name: 'ai', root: true }] });
  const applied = ext({
    name: 'Applied',
    family: [{ name: 'ai' }],
    configEntries: { 'aiSwapper.menu': {} },
  });
  const other = ext({ name: 'Other' });

  it('reports both explicit members', () => {
    expect(
      findProfileFamilyConflicts(profile(['Applied', 'Bare', 'Other']), [
        bare,
        applied,
        other,
      ]),
    ).toEqual([{ family: 'ai', members: [applied, bare] }]);
  });

  it('does not count a files-only dependency as a choice', () => {
    expect(
      findProfileFamilyConflicts(profile(['Applied'], ['Applied', 'Bare']), [
        bare,
        applied,
      ]),
    ).toEqual([]);
  });

  it('drops the unchosen member from both load orders without changing the input', () => {
    const input = profile(['Applied', 'Bare'], ['Applied', 'Bare', 'Other']);
    const result = withoutProfileMembers(input, ['Bare']);
    expect(result['config-sparse']['load-order']).toEqual([
      { extension: 'Applied', version: '1.0.0' },
    ]);
    expect(result['config-full']!['load-order']).toEqual([
      { extension: 'Applied', version: '1.0.0' },
      { extension: 'Other', version: '1.0.0' },
    ]);
    expect(input['config-sparse']['load-order']).toHaveLength(2);
  });
});
