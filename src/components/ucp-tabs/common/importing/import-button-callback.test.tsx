import { createStore } from 'jotai';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { parse, stringify } from 'yaml';
import { ConfigFile } from '../../../../config/ucp/common';
import { serializeUCPConfig } from '../../../../config/ucp/config-files/config-files';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../../function/configuration/state';
import { EXTENSION_STATE_INTERFACE_ATOM } from '../../../../function/extensions/state/state';
import { buildExtensionConfigurationDB } from '../../../../function/configuration/extension-configuration/build-extension-configuration-db';
import { getStore } from '../../../../hooks/jotai/base';
import { requiredSettingsState } from '../../../../testing/required-settings-state';
import { MessageResolver } from '../../../../localization/localization';
import { showModalOk } from '../../../modals/modal-ok';
import {
  importUcpConfig,
  constructUserConfigObjects,
} from './import-button-callback';

vi.mock('../../../../hooks/jotai/base', () => ({ getStore: vi.fn() }));
vi.mock('../../../modals/modal-ok', () => ({ showModalOk: vi.fn() }));

const HOTKEYS = 'ucp2-legacy.o_keys.enabled';
const UNRELATED = 'ucp2-legacy.unrelated';
const localize = ((key: string) => key) as MessageResolver;

function savedConfig(
  preferences: Record<string, unknown>,
  full: Record<string, unknown>,
) {
  const state = requiredSettingsState();
  return serializeUCPConfig(
    preferences,
    full,
    state.explicitlyActivatedExtensions,
    state.activeExtensions,
    {},
  );
}

function warningContent() {
  expect(showModalOk).toHaveBeenCalledTimes(1);
  const { message } = vi.mocked(showModalOk).mock.calls[0][0];
  if (typeof message !== 'function') throw Error('Expected rendered changes');
  return render(message(localize));
}

beforeEach(() => {
  vi.mocked(getStore).mockReturnValue(createStore());
  vi.mocked(showModalOk).mockClear();
  getStore().set(EXTENSION_STATE_INTERFACE_ATOM, requiredSettingsState());
});

describe('loading saved configuration', () => {
  test('repairs a required value in both sections and reports it once', () => {
    const config = savedConfig(
      { [HOTKEYS]: true, [UNRELATED]: 'keep me' },
      { [HOTKEYS]: true, [UNRELATED]: 'keep me' },
    );
    expect(importUcpConfig(config, vi.fn()).status).toBe('success');
    expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual({
      [HOTKEYS]: false,
      [UNRELATED]: 'keep me',
    });
    expect(getStore().get(CONFIGURATION_FULL_REDUCER_ATOM)).toEqual({
      [HOTKEYS]: false,
      [UNRELATED]: 'keep me',
    });
    expect(getStore().get(CONFIGURATION_TOUCHED_REDUCER_ATOM)).toEqual({
      [HOTKEYS]: true,
    });
    const { container } = warningContent();
    expect(container.querySelectorAll('li')).toHaveLength(1);
    expect(
      screen.getByText('config.load.changed.preference: true → false'),
    ).toBeDefined();
    expect(
      screen.getByText('config.load.changed.game: true → false'),
    ).toBeDefined();
  });

  test('repairs a hidden sparse conflict even when the saved game value was already correct', () => {
    const config = savedConfig(
      { [HOTKEYS]: true },
      { [HOTKEYS]: false, [UNRELATED]: 'suggested' },
    );
    importUcpConfig(config, vi.fn());
    warningContent();
    expect(
      screen.getByText('config.load.changed.preference: true → false'),
    ).toBeDefined();
    expect(screen.queryByText(/config.load.changed.game:/)).toBeNull();
  });

  test('reports changed, added and removed game values without sparse overrides', () => {
    const config = savedConfig(
      {},
      { [HOTKEYS]: true, 'ucp2-legacy.removed': '' },
    );
    importUcpConfig(config, vi.fn());
    expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual({});
    warningContent();
    [
      'config.load.changed.game: true → false',
      'config.load.changed.game: config.load.changed.unset → "suggested"',
      'config.load.changed.game: "" → config.load.changed.unset',
    ].forEach((text) => expect(screen.getByText(text)).toBeDefined());
    expect(screen.queryByText(/config.load.changed.preference:/)).toBeNull();
  });

  test('keeps a repair through save and reload, and after the requiring extension is removed', () => {
    const config = savedConfig({ [HOTKEYS]: true }, { [HOTKEYS]: true });
    const original = stringify(config);
    importUcpConfig(config, vi.fn());
    expect(stringify(config)).toBe(original);
    const state = getStore().get(EXTENSION_STATE_INTERFACE_ATOM);
    const saved = serializeUCPConfig(
      getStore().get(CONFIGURATION_USER_REDUCER_ATOM),
      getStore().get(CONFIGURATION_FULL_REDUCER_ATOM),
      state.explicitlyActivatedExtensions,
      state.activeExtensions,
      {},
    );
    expect(constructUserConfigObjects(saved).userConfig[HOTKEYS]).toBe(false);

    vi.mocked(showModalOk).mockClear();
    getStore().set(CONFIGURATION_USER_REDUCER_ATOM, { type: 'clear-all' });
    importUcpConfig(parse(stringify(saved)) as ConfigFile, vi.fn());
    expect(showModalOk).not.toHaveBeenCalled();

    getStore().set(
      EXTENSION_STATE_INTERFACE_ATOM,
      buildExtensionConfigurationDB({
        ...state,
        activeExtensions: [state.extensions[0]],
        explicitlyActivatedExtensions: [state.extensions[0]],
      }),
    );
    expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)[HOTKEYS]).toBe(
      false,
    );
    expect(getStore().get(CONFIGURATION_FULL_REDUCER_ATOM)[HOTKEYS]).toBe(
      false,
    );
  });

  test('does not warn about structurally equal object preferences', () => {
    const value = { nested: ['x', 0, false, ''] };
    const config = savedConfig(
      { [UNRELATED]: value },
      { [HOTKEYS]: false, [UNRELATED]: structuredClone(value) },
    );
    importUcpConfig(config, vi.fn());
    expect(showModalOk).not.toHaveBeenCalled();
  });

  test.each([
    ['no config-full', (config: ConfigFile) => delete config['config-full']],
    [
      'a config-full with only a load order',
      (config: ConfigFile) => {
        const full = config['config-full'] as unknown as Record<string, unknown>;
        delete full.modules;
        delete full.plugins;
      },
    ],
  ])('loads %s without comparing game values', (_, strip) => {
    const config = savedConfig(
      { [HOTKEYS]: true, [UNRELATED]: 'keep me' },
      { [HOTKEYS]: true },
    );
    strip(config);
    expect(importUcpConfig(config, vi.fn()).status).toBe('success');
    warningContent();
    expect(
      screen.getByText('config.load.changed.preference: true → false'),
    ).toBeDefined();
    expect(screen.queryByText(/config.load.changed.game:/)).toBeNull();
    expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual({
      [HOTKEYS]: false,
      [UNRELATED]: 'keep me',
    });
  });

  test('does not change the current preferences or show a repair warning when import fails', () => {
    const config = savedConfig({ [HOTKEYS]: true }, {});
    config['config-full']['load-order'][0].extension = 'missing';
    config['config-sparse']['load-order'][0].extension = 'missing';
    expect(importUcpConfig(config, vi.fn()).status).toBe('fail');
    expect(showModalOk).not.toHaveBeenCalled();
    expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual({});
  });
});
