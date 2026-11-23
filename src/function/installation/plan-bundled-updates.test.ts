import { describe, expect, it, vi } from 'vitest';
import { Range } from 'semver';
import { Dependency } from 'lean-resolution';
import { Extension } from '../../config/ucp/common';
import { ContentStore, ExtensionContent } from '../content/store/fetch';
import { DependencyTree } from '../extensions/dependency-management/dependency-resolution';
import { planBundledUpdates } from './plan-bundled-updates';
import { validateBundledUpdates } from './validate-bundled-updates';

// Ceiling for the setup step's version checks with 50 names x 5 versions
// (measured: 501); a backtracking search would need orders of magnitude more
const CHECKS_FOR_50_NAMES = 2000;

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
  type: 'module' | 'plugin' = 'module',
) {
  return {
    definition: { name, version, dependencies, type },
    contents: {
      package: [
        type === 'module'
          ? { method: 'github-binary', signature: 'signed' }
          : { method: 'github-binary' },
      ],
    },
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

describe('fresh-install default setup', () => {
  const SETUP = 'ucp3-basics-fixes';
  const frontend = { frontend: '>=1.0.17 <2.0.0' };
  const bundled = [
    local('ucp2-legacy-defaults', '2.15.1'),
    local('graphicsApiReplacer', '1.3.0'),
  ];
  const plugin = (
    name: string,
    version: string,
    dependencies: Record<string, string> = {},
  ) => online(name, version, dependencies, 'plugin');
  const setup = (
    dependencies: Record<string, string> = {},
    version = '1.0.0',
  ) =>
    plugin(SETUP, version, {
      'ucp3-basics': '^1.0.0',
      'ucp3-fixes': '^0.2.0',
      ...frontend,
      ...dependencies,
    });
  // The setup reaches two bundled packages and a signed fix module
  const chain = (
    fixes: Record<string, string> = { 'worker-delivery-fix': '^0.2.0' },
    fix = online('worker-delivery-fix', '0.2.0'),
  ) => [
    plugin('ucp3-basics', '1.0.0', {
      'ucp2-legacy-defaults': '^2.15.1',
      graphicsApiReplacer: '^1.3.0',
    }),
    plugin('ucp3-fixes', '0.2.0', fixes),
    fix,
    online('graphicsApiReplacer', '1.4.0'),
    online('unrelated', '1.0.0'),
  ];
  const plan = (
    list: ExtensionContent[],
    gui = '1.0.17',
    installed = bundled,
  ) =>
    planBundledUpdates(installed, catalog(list), gui, '3.0.7', SETUP).map(
      (e) => `${e.definition.name}@${e.definition.version}`,
    );

  it('plans a compatible setup with its dependencies next to bundled updates', () => {
    expect(plan([setup(), ...chain()])).toEqual([
      'ucp3-basics-fixes@1.0.0',
      'ucp3-basics@1.0.0',
      'ucp3-fixes@0.2.0',
      'worker-delivery-fix@0.2.0',
      'graphicsApiReplacer@1.4.0',
    ]);
  });
  it('falls back to an older setup release when the newest needs a newer GUI', () => {
    const newest = setup({ frontend: '>=1.0.18' }, '1.1.0');
    expect(plan([setup(), newest, ...chain()])).toContain(
      'ucp3-basics-fixes@1.0.0',
    );
  });
  const unsignedFix = online('worker-delivery-fix', '0.2.0');
  unsignedFix.contents.package = [{ method: 'github-binary' } as never];
  it.each([
    ['absent from the Store', chain(), '1.0.17'],
    ['for a newer GUI', [setup(), ...chain()], '1.0.16'],
    [
      'for a newer framework',
      [setup({ framework: '>=3.1.0' }), ...chain()],
      '1.0.17',
    ],
    [
      'a prerelease',
      [plugin(SETUP, '1.0.0-rc.1', frontend), ...chain()],
      '1.0.17',
    ],
    [
      'dependent on an unsigned module',
      [setup(), ...chain(undefined, unsignedFix)],
      '1.0.17',
    ],
    [
      'dependent on a missing package',
      [setup(), ...chain({ 'missing-module': '^1.0.0' })],
      '1.0.17',
    ],
    [
      'in a dependency cycle',
      [setup(), ...chain({ [SETUP]: '^1.0.0' })],
      '1.0.17',
    ],
  ])('keeps only the bundled updates when the setup is %s', (_, list, gui) => {
    expect(plan(list, gui)).toEqual(['graphicsApiReplacer@1.4.0']);
  });
  it.each([
    [
      'conflicts with a bundled plugin',
      [
        local('ucp2-legacy-defaults', '2.15.1'),
        local('graphicsApiReplacer', '1.2.0'),
        local('preset', '1.0.0', { graphicsApiReplacer: '<1.3.0' }),
      ],
      [],
      [],
    ],
    [
      'needs an older version than a planned bundled update',
      bundled,
      [online('graphicsApiReplacer', '2.0.0')],
      ['graphicsApiReplacer@2.0.0'],
    ],
  ])(
    'never changes the bundled updates; the setup is dropped when it %s',
    (_, installed, extra, expected) => {
      expect(
        plan([setup(), ...chain(), ...extra], '1.0.17', installed),
      ).toEqual(expected);
    },
  );
  it('accepts a valid helper release next to an older cyclic one', () => {
    expect(
      plan([
        plugin(SETUP, '1.0.0', { helper: '^1.0.0', ...frontend }),
        plugin('helper', '1.0.0', { [SETUP]: '^1.0.0' }),
        plugin('helper', '1.1.0'),
      ]),
    ).toEqual(['ucp3-basics-fixes@1.0.0', 'helper@1.1.0']);
  });
  it.each(['__bundled_updates__', '__installed_updates__'])(
    'ignores a Store package with the reserved request name %s',
    (reserved) => {
      expect(
        plan([
          plugin(SETUP, '1.0.0', frontend),
          plugin(SETUP, '1.1.0', { [reserved]: '^1.0.0', ...frontend }),
          plugin(reserved, '1.0.0', { [SETUP]: '^1.0.0' }),
        ]),
      ).toEqual(['ucp3-basics-fixes@1.0.0']);
    },
  );
});

describe('bounded resolver work for the setup and its validation', () => {
  const SETUP = 'ucp3-basics-fixes';
  // The setup and two helpers per layer; each needs both helpers of the next
  // layer, and the last layer needs frontend and framework
  const layers = (depth: number) => {
    const name = (layer: number, i: number) => `h${layer}-${i}`;
    const next = (layer: number): Record<string, string> =>
      layer + 1 < depth
        ? { [name(layer + 1, 0)]: '^1.0.0', [name(layer + 1, 1)]: '^1.0.0' }
        : { frontend: '>=1.0.0', framework: '>=3.0.0' };
    const specs: [string, Record<string, string>][] = [
      [SETUP, next(-1)],
      ...Array.from({ length: depth }, (_, layer) =>
        [0, 1].map((i): [string, Record<string, string>] => [
          name(layer, i),
          next(layer),
        ]),
      ).flat(),
    ];
    return {
      list: specs.map(([n, d]) => online(n, '1.0.0', d, 'plugin')),
      installed: specs.map(([n, d]) => ({
        ...local(n, '1.0.0', d),
        type: 'plugin',
      })) as Extension[],
    };
  };
  // Resolver solves and version checks that the setup step adds to the plan
  const planCost = (list: ExtensionContent[]) => {
    const checks = vi.spyOn(Dependency.prototype, 'isSatisfiedBy');
    const solves = vi.spyOn(DependencyTree.prototype, 'dependenciesFor');
    const bundled = [local('graphicsApiReplacer', '1.3.0')];
    planBundledUpdates(bundled, catalog(list), '1.0.17', '3.0.7');
    const ordinary = [checks.mock.calls.length, solves.mock.calls.length];
    const result = planBundledUpdates(
      bundled,
      catalog(list),
      '1.0.17',
      '3.0.7',
      SETUP,
    ).map((e) => `${e.definition.name}@${e.definition.version}`);
    const cost = {
      result,
      checks: checks.mock.calls.length - 2 * ordinary[0],
      solves: solves.mock.calls.length - 2 * ordinary[1],
    };
    checks.mockRestore();
    solves.mockRestore();
    return cost;
  };
  const validate = (installed: Extension[], plan: ExtensionContent[]) => {
    const solves = vi.spyOn(DependencyTree.prototype, 'dependenciesFor');
    try {
      validateBundledUpdates(
        [],
        installed,
        plan.map((e) => ({ ...e, installed: false, online: true })),
        '1.0.17',
        '3.0.7',
      );
      return { error: undefined, solves: solves.mock.calls.length };
    } catch (error) {
      return { error: `${error}`, solves: solves.mock.calls.length };
    } finally {
      solves.mockRestore();
    }
  };

  it('selects 50 names with 5 versions each in a bounded number of checks', () => {
    const versions = ['1.0.0', '1.1.0', '1.2.0', '1.3.0', '1.4.0'];
    const names = Array.from({ length: 50 }, (_, i) => `helper${i}`);
    const needs = (i: number): Record<string, string> =>
      i + 1 < names.length
        ? { [names[i + 1]]: '^1.0.0', shared: '^1.0.0' }
        : { shared: '^1.0.0' };
    const { result, checks, solves } = planCost([
      online(
        SETUP,
        '1.0.0',
        Object.fromEntries(names.map((n) => [n, '^1.0.0'])),
        'plugin',
      ),
      ...names.flatMap((n, i) =>
        versions.map((v) => online(n, v, needs(i), 'plugin')),
      ),
      ...versions.map((v) => online('shared', v)),
    ]);
    expect(result).toHaveLength(52);
    expect(result).toContain('helper49@1.4.0');
    expect(solves).toBe(1);
    expect(checks).toBeLessThan(CHECKS_FOR_50_NAMES);
  });
  it('plans and validates a graph just under the traversal budget', () => {
    const { list, installed } = layers(10);
    const { result, solves } = planCost(list);
    expect(result).toHaveLength(21);
    expect(solves).toBe(1);
    expect(validate(installed, list)).toEqual({ error: undefined, solves: 1 });
  });
  it('skips and rejects a graph just over the traversal budget without resolving', () => {
    const { list, installed } = layers(11);
    expect(planCost(list)).toMatchObject({ result: [], solves: 0 });
    const { error, solves } = validate(installed, list);
    expect(error).toContain('cyclic or too large');
    expect(solves).toBe(0);
  });
  it('rejects a reserved package name in planning and validation before resolving', () => {
    const reserved = local('__installed_updates__', '2.0.0');
    const solves = vi.spyOn(DependencyTree.prototype, 'dependenciesFor');
    expect(() =>
      planBundledUpdates([reserved], catalog([]), '1.0.17', '3.0.7', SETUP),
    ).toThrow('Reserved package name: __installed_updates__');
    expect(solves).not.toHaveBeenCalled();
    solves.mockRestore();
    const { list, installed } = layers(1);
    expect(validate([...installed, reserved], list)).toEqual({
      error: expect.stringContaining(
        'Reserved package name: __installed_updates__',
      ),
      solves: 0,
    });
  });
});
