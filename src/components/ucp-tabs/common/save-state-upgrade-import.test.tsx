import { createStore } from 'jotai';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getStore } from '../../../hooks/jotai/base';
import {
  EXTENSION_STATE_INTERFACE_ATOM,
  PREFERRED_EXTENSION_VERSION_ATOM,
} from '../../../function/extensions/state/state';
import { buildExtensionConfigurationDB } from '../../../function/configuration/extension-configuration/build-extension-configuration-db';
import { deserializeSimplifiedSerializedExtensionsStateFromExtensions } from '../../../testing/dump-extensions-state';
import { loadConfigFromFile } from '../../../config/ucp/config-files/config-files';
import { ConfigFile } from '../../../config/ucp/common';
import {
  OkCancelModalWindowProperties,
  showModalOkCancel,
} from '../../modals/modal-ok-cancel';
import { showModalOk } from '../../modals/modal-ok';
import { upgradeExtensionsCallback } from '../config-editor/buttons/upgrade-button';
import { importUcpConfigFile } from './importing/import-button-callback';

vi.mock('../../../hooks/jotai/base', async (original) => ({
  ...(await original<typeof import('../../../hooks/jotai/base')>()),
  getStore: vi.fn(),
}));
vi.mock('../../../config/ucp/config-files/config-files', async (original) => ({
  ...(await original<object>()),
  loadConfigFromFile: vi.fn(),
}));
vi.mock('../../modals/modal-ok-cancel', () => ({ showModalOkCancel: vi.fn() }));
vi.mock('../../modals/modal-ok', () => ({ showModalOk: vi.fn() }));
vi.mock('../../toasts/toasts-display', () => ({
  makeToast: vi.fn(),
  ToastType: { INFO: 'info' },
}));
vi.mock('../extension-manager/extension-elements/reporting', () => ({
  default: async () => true,
}));

const TITLE = 'extensions.savestate.loss.title';

function extension(
  name: string,
  version: string,
  dependencies: Record<string, string> = {},
  saveState?: 'required',
  family?: { name: string; root?: boolean }[],
) {
  const type = saveState ? 'module' : 'plugin';
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
      ...(saveState ? { 'save-state': saveState } : {}),
      ...(family ? { family } : {}),
    },
    configEntries: {},
  };
}

function presetWithTunnels(asFamily = false) {
  const family = asFamily ? [{ name: 'ai', root: true }] : undefined;
  const state = deserializeSimplifiedSerializedExtensionsStateFromExtensions([
    extension('Tunnels', '1.0.0', {}, 'required'),
    extension('Preset', '1.0.0', { Tunnels: '^1.0.0' }, undefined, family),
    extension('Preset', '1.1.0', {}, undefined, family),
    extension('Other', '1.0.0'),
  ] as never);
  const [tunnels, preset10, preset11, other] = state.extensions;
  getStore().set(
    EXTENSION_STATE_INTERFACE_ATOM,
    buildExtensionConfigurationDB({
      ...state,
      activeExtensions: [preset10, tunnels],
      explicitlyActivatedExtensions: [preset10],
    }),
  );
  return { tunnels, preset10, preset11, other };
}

const saveStateAsked = () =>
  vi
    .mocked(showModalOkCancel)
    .mock.calls.some(
      ([spec]) => (spec as OkCancelModalWindowProperties).title === TITLE,
    );

beforeEach(() => {
  vi.mocked(getStore).mockReturnValue(createStore());
  vi.mocked(showModalOkCancel).mockReset();
  vi.mocked(showModalOk).mockReset();
  vi.mocked(showModalOkCancel).mockImplementation(
    async (spec) => spec.title !== TITLE,
  );
});

const loadsOnly = (ext: { name: string; version: string }) =>
  vi.mocked(loadConfigFromFile).mockResolvedValue({
    status: 'OK',
    message: '',
    result: {
      meta: { version: '1.0.0' },
      'config-sparse': {
        modules: {},
        plugins: {},
        'load-order': [{ extension: ext.name, version: ext.version }],
      },
    } as unknown as ConfigFile,
  } as never);

describe('modules that saved games depend on', () => {
  test.each([
    [
      'an upgrade',
      async ({ preset10, preset11 }: ReturnType<typeof presetWithTunnels>) =>
        upgradeExtensionsCallback(
          [{ extension: preset10, upgrades: [preset11] }],
          true,
        ),
    ],
    [
      'a player-initiated import',
      async ({ other }: ReturnType<typeof presetWithTunnels>) => {
        getStore().set(PREFERRED_EXTENSION_VERSION_ATOM, { Preset: '1.0.0' });
        loadsOnly(other);
        const result = await importUcpConfigFile('C:/test/other.yml', vi.fn(), {
          confirmSaveStateLoss: true,
        });
        expect(result.status).toBe('aborted');
        expect(getStore().get(PREFERRED_EXTENSION_VERSION_ATOM)).toEqual({
          Preset: '1.0.0',
        });
      },
    ],
  ])(
    '%s that drops one asks first, and Cancel keeps the setup',
    async (_, run) => {
      const fixture = presetWithTunnels();
      const before = getStore().get(EXTENSION_STATE_INTERFACE_ATOM);
      await run(fixture);
      expect(saveStateAsked()).toBe(true);
      expect(getStore().get(EXTENSION_STATE_INTERFACE_ATOM)).toBe(before);
      expect(before.activeExtensions).toEqual([
        fixture.preset10,
        fixture.tunnels,
      ]);
    },
  );

  test('an upgrade of a family member that drops one is refused', async () => {
    const { preset10, preset11 } = presetWithTunnels(true);
    const before = getStore().get(EXTENSION_STATE_INTERFACE_ATOM);
    await upgradeExtensionsCallback(
      [{ extension: preset10, upgrades: [preset11] }],
      true,
    );
    expect(vi.mocked(showModalOk).mock.calls[0][0].title).toBe(
      'discovery.family.savestate.title',
    );
    expect(saveStateAsked()).toBe(false);
    expect(getStore().get(EXTENSION_STATE_INTERFACE_ATOM)).toBe(before);
  });

  test('a dependency upgrade that drops one from a chosen family member is refused', async () => {
    const state = deserializeSimplifiedSerializedExtensionsStateFromExtensions([
      extension('Tunnels', '1.0.0', {}, 'required'),
      extension('Provider', '1.0.0', { Tunnels: '^1.0.0' }),
      extension('Provider', '1.1.0'),
      extension('Preset', '1.0.0', { Provider: '^1.0.0' }, undefined, [
        { name: 'ai', root: true },
      ]),
    ] as never);
    const [tunnels, provider10, provider11, preset] = state.extensions;
    getStore().set(
      EXTENSION_STATE_INTERFACE_ATOM,
      buildExtensionConfigurationDB({
        ...state,
        activeExtensions: [preset, provider10, tunnels],
        explicitlyActivatedExtensions: [preset],
      }),
    );
    const before = getStore().get(EXTENSION_STATE_INTERFACE_ATOM);
    await upgradeExtensionsCallback(
      [{ extension: provider10, upgrades: [provider11] }],
      true,
    );
    expect(vi.mocked(showModalOk).mock.calls[0][0].title).toBe(
      'discovery.family.savestate.title',
    );
    expect(getStore().get(EXTENSION_STATE_INTERFACE_ATOM)).toBe(before);
  });

  test('loading at startup does not ask', async () => {
    loadsOnly(presetWithTunnels().other);
    const result = await importUcpConfigFile('C:/test/ucp-config.yml', vi.fn());
    expect(result.status).toBe('success');
    expect(saveStateAsked()).toBe(false);
    // Preferred versions are written when the import commits, not while staging.
    expect(getStore().get(PREFERRED_EXTENSION_VERSION_ATOM)).toEqual({
      Other: '1.0.0',
    });
  });
});
