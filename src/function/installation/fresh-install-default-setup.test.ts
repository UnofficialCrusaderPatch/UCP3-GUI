// End to end through the real installer, planner, updater, first
// configuration, configuration initializer and config import. Only transport,
// file system, extraction and discovery are replaced by an in-memory game
// folder.
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'jotai';
import { parse, stringify } from 'yaml';
import { Extension } from '../../config/ucp/common';
import {
  deserializeSimplifiedExtensions,
  SimplifiedSerializedExtension,
} from '../../testing/dump-extensions-state';
import { createBasicExtensionsState } from '../extensions/state/init';
import {
  activateFirstTimeUseExtensions,
  serializeFirstTimeUseState,
} from '../game-folder/modifications/activate-first-time-use-extensions';
import { FIRST_TIME_USE_ATOM } from '../gui-settings/settings';
import { getStore } from '../../hooks/jotai/base';
import { setupExtensionsStateConfiguration } from '../game-folder/initialization/load-extensions-state';
import { installUCPFromZip } from './install-ucp-from-zip';

import bundle from '../game-folder/modifications/tests/extensions.json';

const FOLDER = 'D:/game';
const CONFIG = `${FOLDER}/ucp-config.yml`;

const mocks = vi.hoisted(() => ({
  store: undefined as ReturnType<typeof createStore> | undefined,
  fetch: vi.fn(),
  importConfig: vi.fn(),
  realImport: undefined as unknown as (...args: never[]) => Promise<unknown>,
  onlineEntries: new Map<string, object>(),
  denyWrite: false,
  archiveConfig: undefined as string | undefined,
  archiveDirectory: false,
  directories: new Set<string>(),
  changeBundle: (list: SimplifiedSerializedExtension[]) => list,
  installed: new Map<string, Extension>(),
  written: new Map<string, string>(),
}));

const ok = { getOrThrow() {}, throwIfErr() {}, isOk: () => true };
const remove = (path: string) => {
  [...mocks.installed.values()]
    .filter((e) =>
      [
        `${FOLDER}/ucp/modules/${e.name}-${e.version}.zip`,
        `${FOLDER}/ucp/modules/${e.name}-${e.version}.zip.sig`,
        `${FOLDER}/ucp/plugins/${e.name}-${e.version}`,
      ].includes(path),
    )
    .forEach((e) => mocks.installed.delete(`${e.name}@${e.version}`));
  return ok;
};
const addToFolder = (list: SimplifiedSerializedExtension[]) =>
  deserializeSimplifiedExtensions(list).forEach((e) =>
    mocks.installed.set(`${e.name}@${e.version}`, e),
  );
const bundled = () =>
  JSON.parse(JSON.stringify(bundle)) as SimplifiedSerializedExtension[];

vi.mock('../../hooks/jotai/base', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../hooks/jotai/base')>();
  return { ...actual, getStore: () => mocks.store ?? actual.getStore() };
});
vi.mock('@tauri-apps/api/app', () => ({ getVersion: async () => '1.0.17' }));
vi.mock('@tauri-apps/api/fs', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  exists: async (path: string) =>
    path === `${FOLDER}/ucp`
      ? mocks.installed.size > 0
      : mocks.written.has(path) || mocks.directories.has(path),
}));
vi.mock('../../tauri/tauri-invoke', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  extractZipToPath: async () => {
    addToFolder(mocks.changeBundle(bundled()));
    if (mocks.archiveDirectory) mocks.directories.add(CONFIG);
    if (mocks.archiveConfig !== undefined) {
      mocks.written.set(CONFIG, mocks.archiveConfig);
    }
  },
}));
vi.mock('../../tauri/tauri-files', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  removeFile: async (path: string) => remove(path),
  removeDir: async (path: string) => remove(path),
  // The real loader reads through loadYaml; a directory can't be read
  loadYaml: async (path: string) => {
    const { default: Result } = await import('../../util/structs/result');
    const { parse: parseYaml } = await import('yaml');
    return Result.tryAsync(async () => {
      if (mocks.directories.has(path)) throw new Error('Is a directory');
      if (!mocks.written.has(path)) throw new Error('No such file');
      return parseYaml(mocks.written.get(path)!);
    });
  },
  writeTextFile: async (path: string, text: string) => {
    if (mocks.denyWrite) {
      return {
        throwIfErr() {
          throw new Error('access denied');
        },
      };
    }
    mocks.written.set(path, text);
    return ok;
  },
}));
// The real import, observed: the reload calls its default export
vi.mock(
  '../../components/ucp-tabs/common/importing/import-button-callback',
  async (importOriginal) => {
    const actual =
      await importOriginal<
        typeof import('../../components/ucp-tabs/common/importing/import-button-callback')
      >();
    mocks.realImport = actual.default;
    return { ...actual, default: mocks.importConfig };
  },
);
vi.mock('../ucp-files/ucp-state', async () => {
  const { atom } = await import('jotai');
  return { UCP_FILES_STATE_ATOM: atom(null, () => undefined) };
});
vi.mock('../ucp-files/create-real-bink', () => ({
  createRealBink: async () => ok,
}));
vi.mock('../ucp-files/activate-ucp', () => ({ activateUCP: async () => ok }));
vi.mock('../ucp-files/ucp-version', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  initializeUCPVersion: async () => ({
    status: 'ok',
    version: {
      getBuildRepresentation: () => 'Release',
      getMajorMinorPatchAsString: () => '3.0.7',
      isValidForSemanticVersioning: true,
    },
  }),
}));
vi.mock('../content/store/fetch', () => ({ fetchStore: mocks.fetch }));
vi.mock('../extensions/discovery/discovery', () => ({
  discoverExtensions: async () => [...mocks.installed.values()],
}));
// Download and extraction: the package appears in the game folder
vi.mock(
  '../../components/ucp-tabs/content-manager/buttons/callbacks/install-content',
  () => ({
    installOnlineContent: async (
      elements: { definition: SimplifiedSerializedExtension['definition'] }[],
    ) =>
      elements.map(({ definition: d }) => {
        addToFolder([
          {
            name: d.name,
            version: d.version,
            type: d.type,
            definition: d,
            configEntries: mocks.onlineEntries.get(d.name) ?? {},
          } as unknown as SimplifiedSerializedExtension,
        ]);
        return { status: 'ok' };
      }),
  }),
);

const FRONTEND = '>=1.0.17 <2.0.0';
function online(
  name: string,
  version: string,
  type: 'module' | 'plugin',
  dependencies: Record<string, string>,
) {
  return {
    definition: { name, version, type, dependencies },
    contents: {
      package: [
        type === 'module'
          ? { method: 'github-binary', signature: 'signed' }
          : { method: 'github-binary' },
      ],
    },
  };
}
// UCP3 Basics + Fixes -> UCP3 Basics + UCP3 Fixes -> signed fix module
const store = () => ({
  framework: { version: '=3.0.7' },
  frontend: { version: '>=1.0.0' },
  extensions: {
    list: [
      online('ucp3-basics-fixes', '1.0.0', 'plugin', {
        'ucp3-basics': '^1.0.0',
        'ucp3-fixes': '^0.2.0',
        frontend: FRONTEND,
      }),
      online('ucp3-basics', '1.0.0', 'plugin', {
        'ucp2-legacy-defaults': '^2.15.1',
        graphicsApiReplacer: '^1.3.0',
        frontend: FRONTEND,
      }),
      online('ucp3-fixes', '0.2.0', 'plugin', {
        'worker-delivery-fix': '^0.2.0',
        frontend: '^1.0.2',
      }),
      online('worker-delivery-fix', '0.2.0', 'module', {}),
      online('graphicsApiReplacer', '1.3.0', 'module', {
        winProcHandler: '>= 0.1.0',
      }),
    ],
  },
});

const install = () => installUCPFromZip('framework.zip', FOLDER, vi.fn());
// Install into a fresh folder; its first configuration is part of the install
async function installFresh() {
  expect((await install()).isOk()).toBe(true);
  return parse(mocks.written.get(CONFIG)!);
}
// The player declines the reload and closes the GUI. After a restart, with
// the first-use setting already off, the folder is loaded with its own file
// through the real import.
async function reload() {
  mocks.store = createStore();
  getStore().set(FIRST_TIME_USE_ATOM, false);
  return setupExtensionsStateConfiguration(
    createBasicExtensionsState(
      [...mocks.installed.values()],
      '1.0.17',
      '3.0.7',
    ),
    FOLDER,
    CONFIG,
  );
}
async function restartAndLoad() {
  const saved = mocks.written.get(CONFIG);
  const result = await reload();
  expect(result.isOk(), `${result.err().getOrElse('')}`).toBe(true);
  expect(mocks.importConfig).toHaveBeenCalledWith(
    FOLDER,
    expect.any(Function),
    expect.any(Function),
    CONFIG,
  );
  expect(mocks.written.get(CONFIG)).toBe(saved);
}
type LoadOrder = { extension: string; version: string }[];
const ids = (order: LoadOrder) =>
  order.map((e) => `${e.extension}@${e.version}`);
const setupInstalled = () =>
  [...mocks.installed.values()].filter((e) =>
    ['ucp3-basics-fixes', 'ucp3-basics', 'ucp3-fixes'].includes(e.name),
  );
// A valid profile of the bundled pair, as first use saves it; it pins the
// bundled graphicsApiReplacer 1.2.0
const pairProfile = () =>
  serializeFirstTimeUseState(
    activateFirstTimeUseExtensions(
      createBasicExtensionsState(
        deserializeSimplifiedExtensions(bundled()),
        '1.0.17',
        '3.0.7',
      ),
    ).getOrThrow(),
  );
const withEntries = (names: string[], entries: (name: string) => object) => {
  mocks.changeBundle = (list) =>
    list.map((e) =>
      names.includes(e.name)
        ? ({
            ...e,
            configEntries: { ...e.configEntries, ...entries(e.name) },
          } as unknown as SimplifiedSerializedExtension)
        : e,
    );
};
const requires = (value: boolean) => ({
  'files.conflict': { contents: { 'required-value': value } },
});

describe('fresh install with the default setup (first-use setting off)', () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.store = createStore();
    getStore().set(FIRST_TIME_USE_ATOM, false);
    mocks.fetch.mockReset().mockResolvedValue(store());
    mocks.importConfig
      .mockReset()
      .mockImplementation((...args: never[]) => mocks.realImport(...args));
    mocks.onlineEntries.clear();
    mocks.onlineEntries.set('ucp3-fixes', {
      'worker-delivery-fix.reachable_delivery': {
        contents: { 'suggested-value': true },
      },
    });
    mocks.denyWrite = false;
    mocks.archiveConfig = undefined;
    mocks.changeBundle = (list) => list;
    mocks.archiveDirectory = false;
    mocks.directories.clear();
    mocks.installed.clear();
    mocks.written.clear();
  });

  it('installs UCP3 Basics + Fixes with its configuration, which a restart keeps', async () => {
    const saved = await installFresh();

    expect(ids(saved['config-sparse']['load-order'])).toEqual([
      'ucp3-basics-fixes@1.0.0',
    ]);
    expect(
      saved['config-full'].modules['worker-delivery-fix'].config
        .reachable_delivery.contents.value,
    ).toBe(true);
    // Dependencies load before their dependents; the setup comes last
    expect(ids(saved['config-full']['load-order'])).toEqual([
      'ucp2-legacy@2.15.1',
      'winProcHandler@0.2.0',
      'gmResourceModifier@0.2.0',
      'textResourceModifier@0.3.0',
      'aicloader@1.1.0',
      'files@1.1.0',
      'graphicsApiReplacer@1.3.0',
      'aivloader@1.0.0',
      'aiSwapper@1.1.0',
      'ucp2-ai-files@2.15.1',
      'ucp2-aic-patch@2.15.1',
      'ucp2-vanilla-fixed-aiv@2.15.1',
      'ucp2-legacy-defaults@2.15.1',
      'ucp3-basics@1.0.0',
      'worker-delivery-fix@0.2.0',
      'ucp3-fixes@0.2.0',
      'ucp3-basics-fixes@1.0.0',
    ]);
    expect(mocks.installed.has('graphicsApiReplacer@1.2.0')).toBe(false);
    await restartAndLoad();
  });

  it('saves the bundled pair when the Store is offline', async () => {
    mocks.fetch.mockRejectedValue(new Error('offline'));
    const saved = await installFresh();

    expect(ids(saved['config-sparse']['load-order'])).toEqual([
      'ucp2-legacy-defaults@2.15.1',
      'graphicsApiReplacer@1.2.0',
    ]);
    expect(setupInstalled()).toEqual([]);
    await restartAndLoad();
  });

  it('keeps a valid ucp-config.yml from the archive, without planning or pruning', async () => {
    const profile = pairProfile();
    mocks.archiveConfig = profile;
    expect((await install()).isOk()).toBe(true);

    expect(mocks.written.get(CONFIG)).toBe(profile);
    expect(mocks.fetch).not.toHaveBeenCalled();
    expect(mocks.installed.has('graphicsApiReplacer@1.2.0')).toBe(true);
    expect(setupInstalled()).toEqual([]);
  });

  it.each([
    ['malformed YAML', () => 'config-sparse: [unclosed', false],
    ['YAML without config-sparse', () => 'from: archive\n', false],
    [
      'a directory at ucp-config.yml',
      () => {
        mocks.archiveDirectory = true;
        return undefined;
      },
      false,
    ],
    [
      'settings the reload cannot read',
      () => {
        const profile = parse(pairProfile());
        profile['config-sparse'].plugins['ucp2-legacy-defaults'] = null;
        return stringify(profile);
      },
      false,
    ],
    [
      'a dependency cycle',
      () => {
        // graphicsApiReplacer 1.2.0, which the profile pins, needs
        // winProcHandler, which now needs graphicsApiReplacer
        mocks.changeBundle = (list) =>
          list.map((e) =>
            e.name === 'winProcHandler'
              ? {
                  ...e,
                  definition: {
                    ...e.definition,
                    dependencies: { graphicsApiReplacer: '>= 1.2.0' },
                  },
                }
              : e,
          );
        return pairProfile();
      },
      true,
    ],
  ])(
    'reports an archive profile with %s and leaves every file as it is',
    async (_, arrange, reloadReturnsOk) => {
      const text = arrange();
      mocks.archiveConfig = text;
      const result = await install();

      expect(result.isErr()).toBe(true);
      expect(`${result.err().get()}`).toMatch(
        /The installation has no usable D:\/game\/ucp-config\.yml; the installed files were kept\..*cannot be loaded/s,
      );
      expect(mocks.written.get(CONFIG)).toBe(text);
      expect(mocks.fetch).not.toHaveBeenCalled();
      expect(mocks.installed.has('graphicsApiReplacer@1.2.0')).toBe(true);
      // The next load of the folder ends; it rejects every file but the
      // cycle, whose import reports the invalid tree instead
      expect((await reload()).isOk()).toBe(reloadReturnsOk);
    },
  );

  const [legacy] = bundled().filter((e) => e.name === 'ucp2-legacy-defaults');
  // No setup, and an update of the pair's plugin that passes its metadata and
  // dependency checks, with these settings
  const offerLegacyUpdate = (configEntries: object) => {
    const offer = store();
    offer.extensions.list = [
      ...offer.extensions.list.filter(
        (e) => e.definition.name !== 'ucp3-basics-fixes',
      ),
      online(
        'ucp2-legacy-defaults',
        '2.15.2',
        'plugin',
        legacy.definition.dependencies as unknown as Record<string, string>,
      ),
    ];
    mocks.fetch.mockResolvedValue(offer);
    mocks.onlineEntries.set('ucp2-legacy-defaults', {
      ...legacy.configEntries,
      ...configEntries,
    });
  };
  // A setting whose path is a parent of the bundled ucp2-legacy.ai_housing.*
  // settings: it configures without errors, but the file can't be serialized
  const PARENT_SETTING = {
    'ucp2-legacy.ai_housing': { contents: { 'suggested-value': true } },
  };
  it.each([
    [
      'its Store update would not configure',
      () => {
        offerLegacyUpdate(requires(false));
        withEntries(['ucp2-aic-patch'], () => requires(true));
      },
    ],
    [
      'its Store update would not serialize',
      () => offerLegacyUpdate(PARENT_SETTING),
    ],
    [
      'the setup would not serialize',
      () => mocks.onlineEntries.set('ucp3-basics-fixes', PARENT_SETTING),
    ],
  ])('keeps the bundled pair when %s', async (_, arrange) => {
    arrange();
    const saved = await installFresh();

    expect(ids(saved['config-sparse']['load-order'])).toEqual([
      'ucp2-legacy-defaults@2.15.1',
      'graphicsApiReplacer@1.2.0',
    ]);
    expect(mocks.installed.has('ucp2-legacy-defaults@2.15.2')).toBe(false);
    expect(mocks.installed.has('graphicsApiReplacer@1.3.0')).toBe(false);
    expect(setupInstalled()).toEqual([]);
    await restartAndLoad();
  });

  it('keeps a profile saved during the Store fetch and the bundled versions it pins', async () => {
    // Pins graphicsApiReplacer 1.2.0 while the Store offers 1.3.0
    const profile = pairProfile();
    mocks.fetch.mockImplementation(async () => {
      mocks.written.set(CONFIG, profile);
      return store();
    });
    expect((await install()).isOk()).toBe(true);

    expect(mocks.written.get(CONFIG)).toBe(profile);
    expect(mocks.installed.has('graphicsApiReplacer@1.2.0')).toBe(true);
    expect(mocks.installed.has('graphicsApiReplacer@1.3.0')).toBe(true);
  });

  it.each([
    [
      'the fallback pair is incomplete',
      'Unavailable: graphicsApiReplacer',
      () => {
        mocks.changeBundle = (list) =>
          list.filter((e) => e.name !== 'graphicsApiReplacer');
      },
    ],
    [
      'the fallback configuration has errors',
      'Configuration errors',
      () =>
        withEntries(['ucp2-legacy-defaults', 'ucp2-aic-patch'], (name) =>
          requires(name === 'ucp2-aic-patch'),
        ),
    ],
    [
      'the configuration cannot be written',
      'access denied',
      () => {
        mocks.denyWrite = true;
      },
    ],
  ])(
    'reports a fresh install without a valid first profile when %s',
    async (_, reason, arrange) => {
      mocks.fetch.mockRejectedValue(new Error('offline'));
      arrange();
      const result = await install();

      expect(result.isErr()).toBe(true);
      expect(`${result.err().get()}`).toMatch(
        /The installation has no usable D:\/game\/ucp-config\.yml; the installed files were kept\./,
      );
      expect(`${result.err().get()}`).toContain(reason);
      expect(mocks.written.has(CONFIG)).toBe(false);
      expect(mocks.installed.has('ucp2-legacy-defaults@2.15.1')).toBe(true);
    },
  );
});
