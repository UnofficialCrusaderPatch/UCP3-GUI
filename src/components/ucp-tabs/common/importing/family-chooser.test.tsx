/* eslint-disable no-param-reassign */
import { createStore } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReactElement } from 'react';
import { getStore } from '../../../../hooks/jotai/base';
import { deserializeSimplifiedSerializedExtensionsStateFromExtensions } from '../../../../testing/dump-extensions-state';
import DATA from '../../../../function/game-folder/initialization/tests/load-extensions-state.test.data.json';
import { EXTENSION_STATE_INTERFACE_ATOM } from '../../../../function/extensions/state/state';
import { ConfigFile } from '../../../../config/ucp/common';
import { loadConfigFromFile } from '../../../../config/ucp/config-files/config-files';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from '../buttons/config-serialized-state';
import { importUcpConfigFile } from './import-button-callback';
import { chooseProfileFamilyMembers } from './family-chooser';

vi.mock('../../../../hooks/jotai/base', async (original) => ({
  ...(await original<typeof import('../../../../hooks/jotai/base')>()),
  getStore: vi.fn(),
}));
vi.mock(
  '../../../../config/ucp/config-files/config-files',
  async (original) => ({
    ...(await original<object>()),
    loadConfigFromFile: vi.fn(),
  }),
);
vi.mock('../../../modals/modal-ok-cancel', () => ({
  showModalOkCancel: vi.fn(),
}));
vi.mock('../../../modals/modal-ok', () => ({ showModalOk: vi.fn() }));
vi.mock('../../../../localization/localization', async (original) => {
  const actual =
    await original<typeof import('../../../../localization/localization')>();
  const { atom } = await import('jotai');
  return {
    ...actual,
    GUI_LOCALIZATION_ATOM: atom(async () => (key: unknown) => key),
  };
});

const BARE = 'Aggressive-AI-Behaviour';
const APPLIED = 'Aggressive-AI-Behaviour-Applied';
const BARE_SYNTHETIC = 'Bare';

function installed() {
  const state = deserializeSimplifiedSerializedExtensionsStateFromExtensions(
    JSON.parse(JSON.stringify(DATA.EXTENSIONS)),
  );
  state.extensions
    .filter((ext) => [BARE, APPLIED].includes(ext.name))
    .forEach((ext) => {
      ext.definition.family = [
        { name: 'aggressive', ...(ext.name === BARE ? { root: true } : {}) },
      ];
    });
  return state;
}

function profileWithBoth(state: ReturnType<typeof installed>): ConfigFile {
  const version = (name: string) =>
    state.extensions.find((ext) => ext.name === name)!.version;
  return {
    meta: { version: '1.0.0' },
    'config-sparse': {
      modules: {},
      plugins: {},
      'load-order': [APPLIED, BARE].map((name) => ({
        extension: name,
        version: version(name),
      })),
    },
  } as unknown as ConfigFile;
}

/** The chooser's children with the player's clicks applied. */
function pick(family: string, member: string) {
  vi.mocked(showModalOkCancel).mockImplementationOnce(async (spec) => {
    const chooser = spec.children as ReactElement<{
      onChange: (f: string, m: string) => void;
    }>;
    expect(spec.confirmable!()).toBe(false);
    chooser.props.onChange(family, member);
    expect(spec.confirmable!()).toBe(true);
    return true;
  });
}

beforeEach(() => {
  vi.mocked(getStore).mockReturnValue(createStore());
  vi.mocked(showModalOkCancel).mockReset();
});

describe('loading a profile that selects two members of one family', () => {
  it('loads only the configuration the player keeps and marks the setup unsaved', async () => {
    const state = installed();
    getStore().set(EXTENSION_STATE_INTERFACE_ATOM, state);
    vi.mocked(loadConfigFromFile).mockResolvedValue({
      status: 'OK',
      message: '',
      result: profileWithBoth(state),
    } as never);
    pick('aggressive', APPLIED);

    const result = await importUcpConfigFile('C:/test/ucp-config.yml', vi.fn());

    expect(result.status).toBe('success');
    const loaded = getStore().get(EXTENSION_STATE_INTERFACE_ATOM);
    expect(loaded.explicitlyActivatedExtensions.map((e) => e.name)).toEqual([
      APPLIED,
    ]);
    // Bare stays loaded as Applied's file provider, without claiming the choice.
    expect(loaded.activeExtensions.map((e) => e.name)).toContain(BARE);
    expect(getStore().get(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM)).toBe(true);
  });

  it('changes nothing when the player cancels', async () => {
    const state = installed();
    getStore().set(EXTENSION_STATE_INTERFACE_ATOM, state);
    const before = getStore().get(EXTENSION_STATE_INTERFACE_ATOM);
    vi.mocked(loadConfigFromFile).mockResolvedValue({
      status: 'OK',
      message: '',
      result: profileWithBoth(state),
    } as never);
    vi.mocked(showModalOkCancel).mockResolvedValueOnce(false);

    const result = await importUcpConfigFile('C:/test/ucp-config.yml', vi.fn());

    expect(result).toMatchObject({
      status: 'fail',
      reason: 'family',
      message: 'config.load.family.cancelled',
    });
    expect(getStore().get(EXTENSION_STATE_INTERFACE_ATOM)).toBe(before);
    expect(getStore().get(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM)).toBe(false);
  });

  it('returns the members that were not chosen', async () => {
    const state = installed();
    const [bare, applied] = [BARE, APPLIED].map(
      (name) => state.extensions.find((ext) => ext.name === name)!,
    );
    pick('aggressive', BARE);
    expect(
      await chooseProfileFamilyMembers([
        { family: 'aggressive', members: [applied, bare] },
      ]),
    ).toEqual([APPLIED]);
  });
});

function synthetic(
  name: string,
  {
    type = 'plugin',
    dependencies = {},
    family,
    saveState,
    configEntries = {},
  }: {
    type?: 'plugin' | 'module';
    dependencies?: Record<string, string>;
    family?: { name: string; root?: boolean }[];
    saveState?: 'required';
    configEntries?: Record<string, unknown>;
  } = {},
) {
  return {
    name,
    version: '1.0.0',
    type,
    definition: {
      meta: { version: '1.0.0' },
      name,
      version: '1.0.0',
      author: 'test',
      dependencies,
      'display-name': name,
      description: '',
      type,
      ...(family ? { family } : {}),
      ...(saveState ? { 'save-state': saveState } : {}),
    },
    configEntries,
  };
}

/** Bare (root) and Applied, which needs Provider; the saved setup selects both. */
function savedWithBoth(providerSaveState?: 'required') {
  const state = deserializeSimplifiedSerializedExtensionsStateFromExtensions([
    synthetic('Bare', { family: [{ name: 'ai', root: true }] }),
    synthetic('Provider', {
      type: providerSaveState ? 'module' : 'plugin',
      saveState: providerSaveState,
    }),
    synthetic('Applied', {
      family: [{ name: 'ai' }],
      dependencies: { Provider: '^1.0.0' },
    }),
  ] as never);
  getStore().set(EXTENSION_STATE_INTERFACE_ATOM, state);
  const order = (names: string[]) =>
    names.map((extension) => ({ extension, version: '1.0.0' }));
  vi.mocked(loadConfigFromFile).mockResolvedValue({
    status: 'OK',
    message: '',
    result: {
      meta: { version: '1.0.0' },
      'config-sparse': {
        modules: {},
        plugins: {},
        'load-order': order(['Applied', 'Bare']),
      },
      'config-full': {
        modules: {},
        plugins: {},
        'load-order': order(['Applied', 'Provider', 'Bare']),
      },
    } as unknown as ConfigFile,
  } as never);
  return state;
}

describe('after a family choice', () => {
  it('re-resolves the setup, so a provider only the dropped member needed is gone', async () => {
    savedWithBoth();
    pick('ai', BARE_SYNTHETIC);

    const result = await importUcpConfigFile('C:/test/ucp-config.yml', vi.fn());

    expect(result.status).toBe('success');
    expect(
      getStore()
        .get(EXTENSION_STATE_INTERFACE_ATOM)
        .activeExtensions.map((e) => e.name),
    ).toEqual(['Bare']);
  });

  it('asks before the choice drops a module that saves made with this setup need', async () => {
    savedWithBoth('required');
    const before = getStore().get(EXTENSION_STATE_INTERFACE_ATOM);
    pick('ai', BARE_SYNTHETIC);
    // The second dialog is the save-state warning; cancel it.
    vi.mocked(showModalOkCancel).mockResolvedValueOnce(false);

    const result = await importUcpConfigFile('C:/test/ucp-config.yml', vi.fn());

    expect(result.status).toBe('aborted');
    expect(vi.mocked(showModalOkCancel).mock.calls[1][0].title).toBe(
      'extensions.savestate.loss.title',
    );
    expect(getStore().get(EXTENSION_STATE_INTERFACE_ATOM)).toBe(before);
  });

  it('can only be confirmed when the picks keep one member per family', async () => {
    const state = savedWithBoth();
    const [bare, , applied] = state.extensions;
    const both = { ...applied } as typeof applied;
    vi.mocked(showModalOkCancel).mockImplementationOnce(async (spec) => {
      const chooser = spec.children as ReactElement<{
        onChange: (f: string, m: string) => void;
      }>;
      // Applied belongs to both families; keeping it in one and Bare in the
      // other leaves two kept members in the second family.
      chooser.props.onChange('ai', 'Applied');
      chooser.props.onChange('other', 'Bare');
      expect(spec.confirmable!()).toBe(false);
      chooser.props.onChange('other', 'Applied');
      expect(spec.confirmable!()).toBe(true);
      return true;
    });
    expect(
      await chooseProfileFamilyMembers([
        { family: 'ai', members: [both, bare] },
        { family: 'other', members: [both, bare] },
      ]),
    ).toEqual(['Bare']);
  });
});

describe('keeping a preset that a bundle brought in', () => {
  it('loads it as an explicit choice instead of dropping both', async () => {
    const state = deserializeSimplifiedSerializedExtensionsStateFromExtensions([
      synthetic('Preset-A', {
        family: [{ name: 'ai', root: true }],
        configEntries: {
          'aiSwapper.menu': { contents: { 'suggested-value': 1 } },
        },
      }),
      synthetic('Preset-B', {
        family: [{ name: 'ai' }],
        dependencies: { 'Preset-A': '^1.0.0' },
      }),
    ] as never);
    getStore().set(EXTENSION_STATE_INTERFACE_ATOM, state);
    const order = (names: string[]) =>
      names.map((extension) => ({ extension, version: '1.0.0' }));
    vi.mocked(loadConfigFromFile).mockResolvedValue({
      status: 'OK',
      message: '',
      result: {
        meta: { version: '1.0.0' },
        'config-sparse': {
          modules: {},
          plugins: {},
          'load-order': order(['Preset-B']),
        },
        'config-full': {
          modules: {},
          plugins: {},
          'load-order': order(['Preset-B', 'Preset-A']),
        },
      } as unknown as ConfigFile,
    } as never);
    pick('ai', 'Preset-A');

    const result = await importUcpConfigFile('C:/test/ucp-config.yml', vi.fn());

    expect(result.status).toBe('success');
    const loaded = getStore().get(EXTENSION_STATE_INTERFACE_ATOM);
    expect(loaded.explicitlyActivatedExtensions.map((e) => e.name)).toEqual([
      'Preset-A',
    ]);
    expect(loaded.activeExtensions.map((e) => e.name)).toEqual(['Preset-A']);
  });
});

describe('keeping a preset that a remaining bundle needs', () => {
  it('loads it through the bundle without changing the explicit order', async () => {
    const state = deserializeSimplifiedSerializedExtensionsStateFromExtensions([
      synthetic('Preset', {
        family: [{ name: 'ai', root: true }],
        configEntries: {
          'aiSwapper.menu': { contents: { 'suggested-value': 1 } },
        },
      }),
      synthetic('Rival', { family: [{ name: 'ai' }] }),
      synthetic('Bundle', { dependencies: { Preset: '^1.0.0' } }),
    ] as never);
    getStore().set(EXTENSION_STATE_INTERFACE_ATOM, state);
    const order = (names: string[]) =>
      names.map((extension) => ({ extension, version: '1.0.0' }));
    vi.mocked(loadConfigFromFile).mockResolvedValue({
      status: 'OK',
      message: '',
      result: {
        meta: { version: '1.0.0' },
        'config-sparse': {
          modules: {},
          plugins: {},
          'load-order': order(['Bundle', 'Rival']),
        },
      } as unknown as ConfigFile,
    } as never);
    pick('ai', 'Preset');

    const result = await importUcpConfigFile('C:/test/ucp-config.yml', vi.fn());

    expect(result.status).toBe('success');
    const loaded = getStore().get(EXTENSION_STATE_INTERFACE_ATOM);
    expect(loaded.explicitlyActivatedExtensions.map((e) => e.name)).toEqual([
      'Bundle',
    ]);
    expect(loaded.activeExtensions.map((e) => e.name).sort()).toEqual([
      'Bundle',
      'Preset',
    ]);
  });
});
