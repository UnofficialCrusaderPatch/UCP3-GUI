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
  test.each([
    [true, false],
    [1, 0],
    ['old', ''],
    [0, false],
    [false, 0],
    [false, ''],
  ])(
    'repairs %j to required %j and reports both saved values once',
    (oldValue, requiredValue) => {
      getStore().set(
        EXTENSION_STATE_INTERFACE_ATOM,
        requiredSettingsState(requiredValue),
      );
      const config = savedConfig(
        { [HOTKEYS]: oldValue, [UNRELATED]: 'keep me' },
        { [HOTKEYS]: oldValue, [UNRELATED]: 'keep me' },
      );
      expect(importUcpConfig(config, vi.fn()).status).toBe('success');
      expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual({
        [HOTKEYS]: requiredValue,
        [UNRELATED]: 'keep me',
      });
      expect(getStore().get(CONFIGURATION_FULL_REDUCER_ATOM)).toEqual({
        [HOTKEYS]: requiredValue,
        [UNRELATED]: 'keep me',
      });
      expect(getStore().get(CONFIGURATION_TOUCHED_REDUCER_ATOM)).toEqual({
        [HOTKEYS]: true,
      });
      const { container } = warningContent();
      expect(container.querySelectorAll('li')).toHaveLength(1);
      const expectedChange = `${JSON.stringify(oldValue)} → ${JSON.stringify(requiredValue)}`;
      expect(
        screen.getByText(`config.load.changed.preference: ${expectedChange}`),
      ).toBeDefined();
      expect(
        screen.getByText(`config.load.changed.game: ${expectedChange}`),
      ).toBeDefined();
    },
  );

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

  test('reports changed requirements and defaults without sparse overrides', () => {
    const config = savedConfig(
      {},
      { [HOTKEYS]: true, [UNRELATED]: 'old default' },
    );
    importUcpConfig(config, vi.fn());
    expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual({});
    warningContent();
    expect(
      screen.getByText('config.load.changed.game: true → false'),
    ).toBeDefined();
    expect(
      screen.getByText('config.load.changed.game: "old default" → "suggested"'),
    ).toBeDefined();
    expect(screen.queryByText(/config.load.changed.preference:/)).toBeNull();
  });

  test('reports added and removed game settings, with explicit empty strings', () => {
    const config = savedConfig(
      {},
      { [HOTKEYS]: false, 'ucp2-legacy.removed': '' },
    );
    importUcpConfig(config, vi.fn());
    warningContent();
    expect(
      screen.getByText(
        'config.load.changed.game: "" → config.load.changed.unset',
      ),
    ).toBeDefined();
    expect(
      screen.getByText(
        'config.load.changed.game: config.load.changed.unset → "suggested"',
      ),
    ).toBeDefined();
  });

  test('retains repairs through YAML save/reload and removal of the requiring extension', () => {
    const config = savedConfig(
      { [HOTKEYS]: true, [UNRELATED]: 'keep me' },
      { [HOTKEYS]: true, [UNRELATED]: 'keep me' },
    );
    const original = stringify(config);
    importUcpConfig(config, vi.fn());
    const state = getStore().get(EXTENSION_STATE_INTERFACE_ATOM);
    const saved = serializeUCPConfig(
      getStore().get(CONFIGURATION_USER_REDUCER_ATOM),
      getStore().get(CONFIGURATION_FULL_REDUCER_ATOM),
      state.explicitlyActivatedExtensions,
      state.activeExtensions,
      {},
    );
    expect(constructUserConfigObjects(saved).userConfig[HOTKEYS]).toBe(false);
    expect(saved['config-full'].modules['ucp2-legacy'].config).toEqual({
      o_keys: { enabled: { contents: { value: false } } },
      unrelated: { contents: { value: 'keep me' } },
    });
    // Loading repairs the store; it does not mutate the supplied disk snapshot.
    expect(stringify(config)).toBe(original);
    vi.mocked(showModalOk).mockClear();
    getStore().set(CONFIGURATION_USER_REDUCER_ATOM, { type: 'clear-all' });
    importUcpConfig(parse(stringify(saved)) as ConfigFile, vi.fn());
    expect(showModalOk).not.toHaveBeenCalled();
    expect(getStore().get(CONFIGURATION_TOUCHED_REDUCER_ATOM)).toEqual({});
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
    expect(getStore().get(CONFIGURATION_FULL_REDUCER_ATOM)[UNRELATED]).toBe(
      'keep me',
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

  test('can load a sparse-only config without inventing a saved game baseline', () => {
    const config: ConfigFile = savedConfig({ [UNRELATED]: 'keep me' }, {});
    delete config['config-full'];
    expect(importUcpConfig(config, vi.fn()).status).toBe('success');
    expect(showModalOk).not.toHaveBeenCalled();
    expect(getStore().get(CONFIGURATION_FULL_REDUCER_ATOM)[HOTKEYS]).toBe(
      false,
    );
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
