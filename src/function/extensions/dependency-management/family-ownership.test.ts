import { describe, expect, it } from 'vitest';
import { Range } from 'semver';
import { ExtensionDependencyTree } from './dependency-resolution';
import { ConfigFile, Extension } from '../../../config/ucp/common';
import {
  acceptFamilyMemberships,
  assertFamilyChoices,
  familyConfigurationMembers,
  FamilyConflictError,
  findProfileFamilyConflicts,
  withAcceptedFamilies,
  withoutProfileMembers,
} from './families';

type Declared = {
  name: string;
  type?: 'plugin' | 'module';
  family?: unknown;
  configEntries?: Record<string, unknown>;
  version?: string;
  dependencies?: Record<string, string>;
};

function ext({
  name,
  type = 'plugin',
  family,
  configEntries = {},
  version = '1.0.0',
  dependencies = {},
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
      dependencies: Object.fromEntries(
        Object.entries(dependencies).map(([dep, range]) => [
          dep,
          new Range(range),
        ]),
      ),
      ...(family === undefined ? {} : { family }),
    },
  } as unknown as Extension;
}

const root = (members?: string[], version = '1.0.0', extra = {}) =>
  ext({
    name: 'Bare',
    version,
    family: [
      { name: 'ai', root: true, ...(members ? { members } : {}), ...extra },
    ],
  });
const member = (
  name: string,
  type: 'plugin' | 'module' = 'plugin',
  dependencies: Record<string, string> = {},
) => ext({ name, type, dependencies, family: [{ name: 'ai' }] });
const accepted = (items: Extension[]) => {
  const { accepted: map, warnings } = acceptFamilyMemberships(items);
  return { families: items.map((item) => map.get(item)), warnings };
};

describe('family ownership', () => {
  it.each([
    [
      'a member the root lists',
      [root(['Applied']), member('Applied')],
      [{ name: 'ai' }],
      [],
    ],
    [
      'a member the root does not list, even by the same author',
      [root(), member('Applied')],
      [],
      [
        "Applied: family 'ai' ignored, the root Bare does not list it as a member.",
      ],
    ],
    [
      'a family whose root versions list different members',
      [root(['Applied'], '1.0.0'), root([], '1.1.0'), member('Applied')],
      [],
      [
        "Bare: family 'ai' ignored, versions of its root Bare list different members.",
        "Bare: family 'ai' ignored, versions of its root Bare list different members.",
        "Applied: family 'ai' ignored, versions of its root Bare list different members.",
      ],
    ],
    [
      'a member of a root whose newer version predates families',
      [
        root(['Applied'], '1.0.0'),
        ext({ name: 'Bare', version: '2.0.0' }),
        member('Applied'),
      ],
      [{ name: 'ai' }],
      [],
    ],
    [
      'a module',
      [root(['Code']), member('Code', 'module')],
      [],
      ["Code: family 'ai' ignored, only plugins can be family members."],
    ],
  ])('%s', (_, items, expected, warnings) => {
    const result = accepted(items);
    expect(result.families[items.length - 1]).toEqual(expected);
    expect(result.warnings).toEqual(warnings);
  });

  it('keeps the root entry as declared, including its default', () => {
    const items = [root(['Applied'], '1.0.0', { default: 'Applied' })];
    expect(accepted(items).families).toEqual([
      [{ name: 'ai', root: true, members: ['Applied'], default: 'Applied' }],
    ]);
  });

  it('only accepts default on a root entry', () => {
    const items = [
      root(['Applied']),
      ext({ name: 'Applied', family: [{ name: 'ai', default: 'Applied' }] }),
    ];
    expect(accepted(items).families[1]).toEqual([]);
  });

  it('ignores families without exactly one root plugin name, and module root claims', () => {
    const items = [
      ext({ name: 'Orphan', family: [{ name: 'none' }] }),
      ext({ name: 'RootA', family: [{ name: 'two', root: true }] }),
      ext({ name: 'RootB', family: [{ name: 'two', root: true }] }),
      root(['Applied']),
      member('Applied'),
      ext({
        name: 'Code',
        type: 'module',
        family: [{ name: 'ai', root: true }],
      }),
      ext({
        name: 'Fixes',
        type: 'module',
        family: [{ name: 'fixes', root: true }],
      }),
      ext({ name: 'FixesPreset', family: [{ name: 'fixes' }] }),
    ];
    const { families, warnings } = accepted(items);
    expect(families).toEqual([
      [],
      [],
      [],
      [{ name: 'ai', root: true, members: ['Applied'] }],
      [{ name: 'ai' }],
      [],
      [],
      [],
    ]);
    expect(warnings).toContain(
      "FixesPreset: family 'fixes' ignored, its root is a module.",
    );
  });

  it('returns filtered copies and keeps the authored declaration for the Store view', () => {
    const applied = member('Applied');
    const {
      items: [installedOnly],
    } = withAcceptedFamilies([applied]);
    expect(installedOnly.definition.family).toEqual([]);
    expect(applied.definition.family).toEqual([{ name: 'ai' }]);
    const wider = withAcceptedFamilies([
      root(['Applied']),
      {
        ...installedOnly,
        definition: {
          ...installedOnly.definition,
          family: installedOnly.definition.declaredFamily,
        },
      },
    ]);
    expect(wider.items[1].definition.family).toEqual([{ name: 'ai' }]);
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
  const bare = root(['Applied']);
  const applied = ext({
    name: 'Applied',
    family: [{ name: 'ai' }],
    configEntries: { 'aiSwapper.menu': {} },
  });
  const bundle = ext({ name: 'Bundle', dependencies: { Applied: '^1.0.0' } });
  const installed = [bare, applied, bundle];
  const tree = () => new ExtensionDependencyTree(installed, '1.0.17', '3.0.7');
  const conflicting = (config: ConfigFile, withTree = true) =>
    findProfileFamilyConflicts(
      config,
      installed,
      withTree ? tree() : undefined,
    ).map(({ family, members }) => [family, members.map((m) => m.name).sort()]);

  it.each([
    [
      'two explicit members',
      profile(['Applied', 'Bare']),
      [['ai', ['Applied', 'Bare']]],
    ],
    ['a files-only dependency', profile(['Applied'], ['Applied', 'Bare']), []],
    [
      'a preset a bundle brings in next to an explicit sibling',
      profile(['Bundle', 'Bare']),
      [['ai', ['Applied', 'Bare']]],
    ],
  ])('%s', (_, config, expected) => {
    expect(conflicting(config)).toEqual(expected);
  });

  it('uses the explicit closure when the saved full order names a version that is not installed', () => {
    const config = profile(['Bundle', 'Bare'], ['Bundle', 'Bare']);
    config['config-full']!['load-order'].push({
      extension: 'Removed',
      version: '1.0.0',
    });
    expect(conflicting(config).map(([family]) => family)).toEqual(['ai']);
  });

  it('ignores an entry whose exact version is not installed', () => {
    const config = profile(['Bare']);
    config['config-sparse']['load-order'].unshift({
      extension: 'Applied',
      version: '9.9.9',
    });
    expect(conflicting(config, false)).toEqual([]);
  });

  it('keeps the explicit choices and drops the saved full order so the import re-resolves', () => {
    const input = profile(['Applied', 'Bare'], ['Applied', 'Bare', 'Other']);
    const result = withoutProfileMembers(input, ['Bare']);
    expect(result['config-sparse']['load-order']).toEqual([
      { extension: 'Applied', version: '1.0.0' },
    ]);
    expect(result['config-full']).toEqual({ modules: {}, plugins: {} });
    expect(input['config-sparse']['load-order']).toHaveLength(2);
    expect(input['config-full']!['load-order']).toHaveLength(3);
  });

  const preset = ext({
    name: 'Preset',
    version: '1.2.0',
    dependencies: { Base: '^1.0.0' },
  });
  it.each([
    [
      'after the remaining selections without a consumer',
      ['Other', 'Last'],
      () => false,
      ['Other', 'Last', 'Preset'],
    ],
    [
      'before the first selection that needs it, after its providers',
      ['Base', 'Widget', 'Other'],
      ({ extension }: { extension: string }) => extension === 'Widget',
      ['Base', 'Preset', 'Widget', 'Other'],
    ],
    [
      'never before its own explicit provider',
      ['Widget', 'Base'],
      ({ extension }: { extension: string }) => extension === 'Widget',
      ['Widget', 'Base', 'Preset'],
    ],
    [
      'in place of an explicit entry of the same name, at the chosen version',
      ['Preset', 'Other'],
      () => false,
      ['Preset', 'Other'],
    ],
  ])('places a promoted member %s', (_, explicit, needs, expected) => {
    const order = withoutProfileMembers(profile(explicit), [], [preset], needs)[
      'config-sparse'
    ]['load-order'];
    expect(order.map(({ extension }) => extension)).toEqual(expected);
    expect(order.find(({ extension }) => extension === 'Preset')?.version).toBe(
      '1.2.0',
    );
  });
});

describe('wrapper members', () => {
  const cfg = { 'ucp3-fixes.worker-delivery': {} };

  it('claims its slot when a preset plugin it wraps applies configuration', () => {
    const basics = ext({
      name: 'ucp3-basics',
      family: [{ name: 'ucp3', root: true, members: ['ucp3-basics-fixes'] }],
    });
    const fixesPreset = ext({ name: 'ucp3-fixes', configEntries: cfg });
    const wrapper = ext({
      name: 'ucp3-basics-fixes',
      family: [{ name: 'ucp3' }],
      dependencies: { 'ucp3-basics': '^1.0.0', 'ucp3-fixes': '^1.0.0' },
    });
    const third = ext({
      name: 'third',
      dependencies: { 'ucp3-basics-fixes': '^1.0.0' },
    });
    const state = {
      activeExtensions: [third, wrapper, fixesPreset, basics],
      explicitlyActivatedExtensions: [third, basics],
    };
    expect(familyConfigurationMembers(state).map((e) => e.name)).toEqual([
      'third',
      'ucp3-basics-fixes',
      'ucp3-fixes',
      'ucp3-basics',
    ]);
    expect(() => assertFamilyChoices(state)).toThrow(FamilyConflictError);
  });

  it('does not make a files-only member claim because of a module it needs', () => {
    const swapper = ext({
      name: 'aiSwapper',
      type: 'module',
      configEntries: cfg,
    });
    const bareFiles = ext({
      name: 'Bare',
      family: [{ name: 'ai', root: true }],
      dependencies: { aiSwapper: '^1.0.0' },
    });
    const appliedPreset = ext({
      name: 'Applied',
      family: [{ name: 'ai' }],
      configEntries: cfg,
      dependencies: { Bare: '^1.0.0' },
    });
    expect(() =>
      assertFamilyChoices({
        activeExtensions: [appliedPreset, bareFiles, swapper],
        explicitlyActivatedExtensions: [appliedPreset],
      }),
    ).not.toThrow();
  });
});
