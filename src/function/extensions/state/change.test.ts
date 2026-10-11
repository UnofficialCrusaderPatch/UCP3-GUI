import { createStore } from 'jotai';
import { describe, expect, test } from 'vitest';
import { serializeUCPConfig } from '../../../config/ucp/config-files/config-files';
import { deserializeSimplifiedSerializedExtensionsStateFromExtensions } from '../../../testing/dump-extensions-state';
import { buildExtensionConfigurationDB } from '../../configuration/extension-configuration/build-extension-configuration-db';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../configuration/state';
import { parseConfigEntries } from '../discovery/parse-config-entries';
import { EXTENSION_STATE_INTERFACE_ATOM } from './state';

const LEGACY_HOTKEYS = 'ucp2-legacy.o_keys.enabled';

function requiredSettingsState(requiredValue: unknown = false) {
  const { configEntries } = parseConfigEntries({
    meta: { version: '1.0.0' },
    'config-sparse': {
      modules: {
        'ucp2-legacy': {
          config: {
            o_keys: {
              enabled: { contents: { 'required-value': requiredValue } },
            },
            unrelated: { contents: { 'suggested-value': 'suggested' } },
          },
        },
      },
      plugins: {},
      'load-order': [],
    },
  });
  const extensions = ['ucp2-legacy', 'custom-hotkeys'].map((name) => ({
    name,
    version: name === 'ucp2-legacy' ? '2.15.1' : '0.2.1',
    type: 'module',
    definition: {
      meta: { version: '1.0.0' },
      name,
      version: name === 'ucp2-legacy' ? '2.15.1' : '0.2.1',
      author: 'test',
      dependencies: {},
      'display-name': name,
      description: '',
      type: 'module' as const,
    },
    configEntries: name === 'custom-hotkeys' ? configEntries : {},
  }));
  const state =
    deserializeSimplifiedSerializedExtensionsStateFromExtensions(extensions);
  return buildExtensionConfigurationDB({
    ...state,
    activeExtensions: state.extensions,
    explicitlyActivatedExtensions: state.extensions,
  });
}

describe('effective extension configuration', () => {
  test.each([false, true, 0, ''])(
    'enforces required value %j when restoring user configuration',
    (requiredValue) => {
      const store = createStore();
      const state = requiredSettingsState(requiredValue);
      const userValues = {
        [LEGACY_HOTKEYS]: 'conflicting saved value',
        'ucp2-legacy.unrelated': 'user preference',
        'ucp2-legacy.other': 42,
      };
      store.set(CONFIGURATION_USER_REDUCER_ATOM, {
        type: 'reset',
        value: userValues,
      });
      store.set(EXTENSION_STATE_INTERFACE_ATOM, state);

      expect(store.get(CONFIGURATION_FULL_REDUCER_ATOM)).toEqual({
        ...userValues,
        [LEGACY_HOTKEYS]: requiredValue,
      });
      expect(store.get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual(userValues);
      expect(state.configuration.locks[LEGACY_HOTKEYS]).toEqual({
        lockedBy: 'custom-hotkeys',
        lockedValue: requiredValue,
      });
    },
  );

  test('saves required-off to the game configuration and restores the preference after deactivation', async () => {
    const store = createStore();
    const state = requiredSettingsState();
    store.set(CONFIGURATION_USER_REDUCER_ATOM, {
      type: 'reset',
      value: { [LEGACY_HOTKEYS]: true },
    });
    store.set(EXTENSION_STATE_INTERFACE_ATOM, state);

    const saved = await serializeUCPConfig(
      store.get(CONFIGURATION_USER_REDUCER_ATOM),
      store.get(CONFIGURATION_FULL_REDUCER_ATOM),
      state.explicitlyActivatedExtensions,
      state.activeExtensions,
      {},
    );
    expect(saved['config-full'].modules['ucp2-legacy'].config).toEqual({
      o_keys: { enabled: { contents: { value: false } } },
      unrelated: { contents: { value: 'suggested' } },
    });
    expect(saved['config-sparse'].modules['ucp2-legacy'].config).toEqual({
      o_keys: { enabled: { contents: { 'suggested-value': true } } },
    });

    store.set(
      EXTENSION_STATE_INTERFACE_ATOM,
      buildExtensionConfigurationDB({
        ...state,
        activeExtensions: [state.extensions[0]],
        explicitlyActivatedExtensions: [state.extensions[0]],
      }),
    );
    expect(store.get(CONFIGURATION_FULL_REDUCER_ATOM)[LEGACY_HOTKEYS]).toBe(
      true,
    );
  });
});
