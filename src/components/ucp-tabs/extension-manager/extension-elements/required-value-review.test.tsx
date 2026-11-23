import { createStore } from 'jotai';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getStore } from '../../../../hooks/jotai/base';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../../function/configuration/state';
import { EXTENSION_STATE_INTERFACE_ATOM } from '../../../../function/extensions/state/state';
import { buildExtensionConfigurationDB } from '../../../../function/configuration/extension-configuration/build-extension-configuration-db';
import { parseConfigEntries } from '../../../../function/extensions/discovery/parse-config-entries';
import { deserializeSimplifiedSerializedExtensionsStateFromExtensions } from '../../../../testing/dump-extensions-state';
import { requiredSettingsExtensions } from '../../../../testing/required-settings-state';
import { serializeUCPConfig } from '../../../../config/ucp/config-files/config-files';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';
import { addExtensionToExplicityActivatedExtensions } from '../extensions-state-manipulation';
import inactiveExtensionElementClickCallback from './inactive-extension-element-click-callback';
import { upgradeExtensionsCallback } from '../../config-editor/buttons/upgrade-button';

vi.mock('../../../../hooks/jotai/base', async (original) => ({
  ...(await original<typeof import('../../../../hooks/jotai/base')>()),
  getStore: vi.fn(),
}));
vi.mock('../../../modals/modal-ok-cancel', () => ({
  showModalOkCancel: vi.fn(),
}));
vi.mock('../../../modals/modal-ok', () => ({ showModalOk: vi.fn() }));
vi.mock('../../../toasts/toasts-display', () => ({
  makeToast: vi.fn(),
  ToastType: { INFO: 'info' },
}));
vi.mock('./reporting', () => ({ default: async () => true }));

const HOTKEYS = 'ucp2-legacy.o_keys.enabled';

function requiring(value: unknown, url = 'ucp2-legacy.o_keys.enabled') {
  const [module, ...path] = url.split('.');
  const leaf = path.reduceRight<Record<string, unknown>>(
    (inner, key) => ({ [key]: inner }),
    { contents: { 'required-value': value } },
  );
  return parseConfigEntries({
    meta: { version: '1.0.0' },
    'config-sparse': {
      modules: { [module]: { config: leaf } },
      plugins: {},
      'load-order': [],
    },
  }).configEntries;
}

function extension(
  name: string,
  version: string,
  configEntries = {},
  dependencies: Record<string, string> = {},
) {
  return {
    name,
    version,
    type: 'plugin',
    definition: {
      meta: { version: '1.0.0' },
      name,
      version,
      author: 'test',
      dependencies,
      'display-name': name,
      description: '',
      type: 'plugin' as const,
    },
    configEntries,
  };
}

beforeEach(() => {
  vi.mocked(getStore).mockReturnValue(createStore());
  vi.mocked(showModalOkCancel).mockReset();
});

describe('required value repairs through the real save path', () => {
  test('activation writes the required value to config-sparse and config-full', async () => {
    vi.mocked(showModalOkCancel).mockResolvedValue(true);
    const installed = requiredSettingsExtensions();
    const legacy = installed.extensions.find((e) => e.name === 'ucp2-legacy')!;
    const hotkeys = installed.extensions.find(
      (e) => e.name === 'custom-hotkeys',
    )!;
    getStore().set(CONFIGURATION_USER_REDUCER_ATOM, {
      type: 'reset',
      value: { [HOTKEYS]: true },
    });
    getStore().set(
      EXTENSION_STATE_INTERFACE_ATOM,
      buildExtensionConfigurationDB(
        addExtensionToExplicityActivatedExtensions(installed, legacy),
      ),
    );

    await inactiveExtensionElementClickCallback(hotkeys);

    const state = getStore().get(EXTENSION_STATE_INTERFACE_ATOM);
    const saved = await serializeUCPConfig(
      getStore().get(CONFIGURATION_USER_REDUCER_ATOM),
      getStore().get(CONFIGURATION_FULL_REDUCER_ATOM),
      state.explicitlyActivatedExtensions,
      state.activeExtensions,
      {},
    );
    expect(saved['config-sparse'].modules['ucp2-legacy'].config.o_keys).toEqual(
      { enabled: { contents: { 'suggested-value': false } } },
    );
    expect(saved['config-full'].modules['ucp2-legacy'].config.o_keys).toEqual({
      enabled: { contents: { value: false } },
    });
  });
});

describe('cancelling a repair confirmation', () => {
  test('an upgrade leaves the active versions and the dependency graph unchanged', async () => {
    const state = deserializeSimplifiedSerializedExtensionsStateFromExtensions([
      extension('Base', '1.0.0'),
      extension('Base', '1.1.0', requiring(false, 'Base.flag')),
      extension('Plugin', '1.0.0', {}, { Base: '^1.0.0' }),
    ] as never);
    const [base10, base11, plugin] = state.extensions;
    getStore().set(CONFIGURATION_USER_REDUCER_ATOM, {
      type: 'reset',
      value: { 'Base.flag': true },
    });
    const before = buildExtensionConfigurationDB({
      ...state,
      activeExtensions: [plugin, base10],
      explicitlyActivatedExtensions: [plugin, base10],
    });
    before.tree.extensionDependenciesForExtensions(before.activeExtensions);
    getStore().set(EXTENSION_STATE_INTERFACE_ATOM, before);
    // Confirm the upgrade, then cancel the required-setting change.
    vi.mocked(showModalOkCancel)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    await upgradeExtensionsCallback(
      [{ extension: base10, upgrades: [base11] }],
      true,
    );

    expect(showModalOkCancel).toHaveBeenCalledTimes(2);
    const after = getStore().get(EXTENSION_STATE_INTERFACE_ATOM);
    expect(after.activeExtensions).toEqual([plugin, base10]);
    expect(after.tree.directExtensionDependenciesFor(plugin)).toEqual([base10]);
    expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual({
      'Base.flag': true,
    });
  });
});

describe('conflicting requirements', () => {
  test('never turn either requirement into the stored preference', () => {
    const state = deserializeSimplifiedSerializedExtensionsStateFromExtensions([
      extension('ucp2-legacy', '2.15.1'),
      extension('wants-on', '1.0.0', requiring(true)),
      extension('wants-off', '1.0.0', requiring(false)),
    ] as never);
    getStore().set(CONFIGURATION_USER_REDUCER_ATOM, {
      type: 'reset',
      value: { [HOTKEYS]: 'saved' },
    });
    const conflicted = buildExtensionConfigurationDB({
      ...state,
      activeExtensions: state.extensions,
      explicitlyActivatedExtensions: state.extensions,
    });
    expect(conflicted.configuration.statusCode).toBe(2);

    getStore().set(EXTENSION_STATE_INTERFACE_ATOM, conflicted);

    expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual({
      [HOTKEYS]: 'saved',
    });
  });
});
