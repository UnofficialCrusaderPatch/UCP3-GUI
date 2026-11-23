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
import { showModalOk } from '../../../modals/modal-ok';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from '../buttons/config-serialized-state';
import { importUcpConfigFile } from './import-button-callback';
import { chooseProfileFamilyMembers } from './family-chooser';
import { buildExtensionConfigurationDB } from '../../../../function/configuration/extension-configuration/build-extension-configuration-db';
import { addExtensionToExplicityActivatedExtensions } from '../../extension-manager/extensions-state-manipulation';

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
        {
          name: 'aggressive',
          ...(ext.name === BARE ? { root: true, members: [APPLIED] } : {}),
        },
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
  vi.mocked(showModalOk).mockReset();
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
});

function synthetic(
  name: string,
  {
    type = 'plugin',
    dependencies = {},
    family,
    saveState,
    version = '1.0.0',
    preset = false,
  }: {
    type?: 'plugin' | 'module';
    dependencies?: Record<string, string>;
    family?: { name: string; root?: boolean; members?: string[] }[];
    saveState?: 'required';
    version?: string;
    preset?: boolean;
  } = {},
) {
  return {
    name,
    version,
    type,
    definition: {
      meta: { version: '1.0.0' },
      name,
      version,
      author: 'test',
      dependencies,
      'display-name': name,
      description: '',
      type,
      ...(family ? { family } : {}),
      ...(saveState ? { 'save-state': saveState } : {}),
    },
    configEntries: preset
      ? { 'aiSwapper.menu': { contents: { 'suggested-value': 1 } } }
      : {},
  };
}

/** Installs `extensions` and a saved setup with these load orders of 1.0.0 entries. */
function saved(
  extensions: ReturnType<typeof synthetic>[],
  sparse: string[],
  full?: string[],
) {
  const state = deserializeSimplifiedSerializedExtensionsStateFromExtensions(
    extensions as never,
  );
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
        'load-order': order(sparse),
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
    } as unknown as ConfigFile,
  } as never);
  return state;
}

/** Bare (root) and Applied, which needs Provider; the saved setup selects both. */
const savedWithBoth = (providerSaveState?: 'required') =>
  saved(
    [
      synthetic('Bare', {
        family: [{ name: 'ai', root: true, members: ['Applied'] }],
      }),
      synthetic('Provider', {
        type: providerSaveState ? 'module' : 'plugin',
        saveState: providerSaveState,
      }),
      synthetic('Applied', {
        family: [{ name: 'ai' }],
        dependencies: { Provider: '^1.0.0' },
      }),
    ],
    ['Applied', 'Bare'],
    ['Applied', 'Provider', 'Bare'],
  );

const activeIds = () =>
  getStore()
    .get(EXTENSION_STATE_INTERFACE_ATOM)
    .activeExtensions.map((e) => `${e.name}@${e.version}`)
    .sort();

describe('after a family choice', () => {
  it('re-resolves the setup, so a provider only the dropped member needed is gone', async () => {
    savedWithBoth();
    pick('ai', BARE_SYNTHETIC);
    const result = await importUcpConfigFile('C:/test/ucp-config.yml', vi.fn());
    expect(result.status).toBe('success');
    expect(activeIds()).toEqual(['Bare@1.0.0']);
  });

  it('is refused when it would drop a module that saves made with this setup need', async () => {
    savedWithBoth('required');
    const before = getStore().get(EXTENSION_STATE_INTERFACE_ATOM);
    pick('ai', BARE_SYNTHETIC);

    const result = await importUcpConfigFile('C:/test/ucp-config.yml', vi.fn());

    expect(result).toMatchObject({
      status: 'fail',
      reason: 'family',
      message: 'discovery.family.savestate.message',
    });
    expect(showModalOkCancel).toHaveBeenCalledTimes(1);
    expect(vi.mocked(showModalOk).mock.calls[0][0].title).toBe(
      'discovery.family.savestate.title',
    );
    expect(getStore().get(EXTENSION_STATE_INTERFACE_ATOM)).toBe(before);
  });

  it('refuses a player import that replaces the live member and drops its save-state module', async () => {
    const state = saved(
      [
        synthetic('Bare', {
          family: [{ name: 'ai', root: true, members: ['Applied'] }],
          dependencies: { Tunnels: '^1.0.0' },
        }),
        synthetic('Tunnels', { type: 'module', saveState: 'required' }),
        synthetic('Applied', { family: [{ name: 'ai' }] }),
      ],
      ['Applied'],
    );
    getStore().set(
      EXTENSION_STATE_INTERFACE_ATOM,
      buildExtensionConfigurationDB(
        addExtensionToExplicityActivatedExtensions(state, state.extensions[0]),
      ),
    );
    const before = getStore().get(EXTENSION_STATE_INTERFACE_ATOM);

    const result = await importUcpConfigFile('C:/test/other.yml', vi.fn(), {
      confirmSaveStateLoss: true,
    });

    expect(result).toMatchObject({ status: 'fail', reason: 'family' });
    expect(showModalOkCancel).not.toHaveBeenCalled();
    expect(vi.mocked(showModalOk).mock.calls[0][0].title).toBe(
      'discovery.family.savestate.title',
    );
    expect(getStore().get(EXTENSION_STATE_INTERFACE_ATOM)).toBe(before);
  });

  it('can only be confirmed when the picks keep one member per family', async () => {
    const state = savedWithBoth();
    const [bare, , applied] = state.extensions;
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
        { family: 'ai', members: [applied, bare] },
        { family: 'other', members: [applied, bare] },
      ]),
    ).toEqual(['Bare']);
  });

  const preset = (version = '1.0.0') =>
    synthetic('Preset', {
      version,
      family: [{ name: 'ai', root: true, members: ['Rival'] }],
      preset: true,
    });
  const rival = (dependencies = {}) =>
    synthetic('Rival', { family: [{ name: 'ai' }], dependencies });
  const bundle = () =>
    synthetic('Bundle', { dependencies: { Preset: '^1.0.0' } });
  it.each([
    [
      'a preset the dropped member brought in becomes an explicit choice',
      [preset(), rival({ Preset: '^1.0.0' })],
      ['Rival'],
      ['Rival', 'Preset'],
      ['Preset'],
      ['Preset@1.0.0'],
    ],
    [
      'a preset a remaining bundle needs loads through it',
      [preset(), rival(), bundle()],
      ['Bundle', 'Rival'],
      undefined,
      ['Bundle'],
      ['Bundle@1.0.0', 'Preset@1.0.0'],
    ],
    [
      'the saved version stays even if a bundle would resolve a newer one',
      [preset(), preset('1.1.0'), rival(), bundle()],
      ['Bundle', 'Rival'],
      ['Preset', 'Bundle', 'Rival'],
      ['Bundle', 'Preset'],
      ['Bundle@1.0.0', 'Preset@1.0.0'],
    ],
  ])(
    'keeping Preset: %s',
    async (_, extensions, sparse, full, explicit, active) => {
      saved(extensions, sparse, full);
      pick('ai', 'Preset');
      const result = await importUcpConfigFile(
        'C:/test/ucp-config.yml',
        vi.fn(),
      );
      expect(result.status).toBe('success');
      const loaded = getStore().get(EXTENSION_STATE_INTERFACE_ATOM);
      expect(
        loaded.explicitlyActivatedExtensions.map((e) => e.name).sort(),
      ).toEqual([...explicit].sort());
      expect(activeIds()).toEqual(active);
    },
  );
});
