import { createStore } from 'jotai';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getStore } from '../../../hooks/jotai/base';
import { EXTENSION_STATE_INTERFACE_ATOM } from '../../../function/extensions/state/state';
import { buildExtensionConfigurationDB } from '../../../function/configuration/extension-configuration/build-extension-configuration-db';
import { deserializeSimplifiedSerializedExtensionsStateFromExtensions } from '../../../testing/dump-extensions-state';
import { loadConfigFromFile } from '../../../config/ucp/config-files/config-files';
import { ConfigFile } from '../../../config/ucp/common';
import {
  OkCancelModalWindowProperties,
  showModalOkCancel,
} from '../../modals/modal-ok-cancel';
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
    },
    configEntries: {},
  };
}

function presetWithTunnels() {
  const state = deserializeSimplifiedSerializedExtensionsStateFromExtensions([
    extension('Tunnels', '1.0.0', {}, 'required'),
    extension('Preset', '1.0.0', { Tunnels: '^1.0.0' }),
    extension('Preset', '1.1.0'),
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
  vi.mocked(showModalOkCancel).mockImplementation(
    async (spec) => spec.title !== TITLE,
  );
});

describe('modules that saved games depend on', () => {
  test('an upgrade that drops one asks first, and Cancel keeps the setup', async () => {
    const { preset10, preset11, tunnels } = presetWithTunnels();
    const before = getStore().get(EXTENSION_STATE_INTERFACE_ATOM);

    await upgradeExtensionsCallback(
      [{ extension: preset10, upgrades: [preset11] }],
      true,
    );

    expect(saveStateAsked()).toBe(true);
    expect(getStore().get(EXTENSION_STATE_INTERFACE_ATOM)).toBe(before);
    expect(before.activeExtensions).toEqual([preset10, tunnels]);
  });

  test('a player-initiated import that drops one asks first, and Cancel keeps the setup', async () => {
    const { other } = presetWithTunnels();
    const before = getStore().get(EXTENSION_STATE_INTERFACE_ATOM);
    vi.mocked(loadConfigFromFile).mockResolvedValue({
      status: 'OK',
      message: '',
      result: {
        meta: { version: '1.0.0' },
        'config-sparse': {
          modules: {},
          plugins: {},
          'load-order': [{ extension: other.name, version: other.version }],
        },
      } as unknown as ConfigFile,
    } as never);

    const result = await importUcpConfigFile('C:/test/other.yml', vi.fn(), {
      confirmSaveStateLoss: true,
    });

    expect(result.status).toBe('aborted');
    expect(saveStateAsked()).toBe(true);
    expect(getStore().get(EXTENSION_STATE_INTERFACE_ATOM)).toBe(before);
  });

  test('loading at startup does not ask', async () => {
    const { other } = presetWithTunnels();
    vi.mocked(loadConfigFromFile).mockResolvedValue({
      status: 'OK',
      message: '',
      result: {
        meta: { version: '1.0.0' },
        'config-sparse': {
          modules: {},
          plugins: {},
          'load-order': [{ extension: other.name, version: other.version }],
        },
      } as unknown as ConfigFile,
    } as never);

    const result = await importUcpConfigFile('C:/test/ucp-config.yml', vi.fn());

    expect(result.status).toBe('success');
    expect(saveStateAsked()).toBe(false);
  });
});
