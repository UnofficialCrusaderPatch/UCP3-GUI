import { createStore } from 'jotai';
import { describe, expect, test } from 'vitest';
import { requiredSettingsState } from '../../../testing/required-settings-state';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../configuration/state';
import { EXTENSION_STATE_INTERFACE_ATOM } from './state';

const LEGACY_HOTKEYS = 'ucp2-legacy.o_keys.enabled';

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
      expect(store.get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual({
        ...userValues,
        [LEGACY_HOTKEYS]: requiredValue,
      });
      expect(state.configuration.locks[LEGACY_HOTKEYS]).toEqual({
        lockedBy: 'custom-hotkeys',
        lockedValue: requiredValue,
      });
    },
  );
});
