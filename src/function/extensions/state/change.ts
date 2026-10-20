import { Getter, Setter } from 'jotai';
import deepEqual from 'deep-equal';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../configuration/state';
import { ExtensionsState } from '../extensions-state';

// eslint-disable-next-line import/prefer-default-export
export function generateAndSetFullConfig(
  get: Getter,
  set: Setter,
  extensionsState: ExtensionsState,
) {
  const { defined, locks } = extensionsState.configuration;
  const userDefinedValues = { ...get(CONFIGURATION_USER_REDUCER_ATOM) };

  // Repair persisted overrides as well as the effective configuration. Otherwise
  // removing a requirement would silently restore the conflicting preference.
  Object.entries(locks).forEach(([url, { lockedValue }]) => {
    if (
      Object.prototype.hasOwnProperty.call(userDefinedValues, url) &&
      !deepEqual(userDefinedValues[url], lockedValue, { strict: true })
    ) {
      userDefinedValues[url] = lockedValue;
    }
  });
  set(CONFIGURATION_USER_REDUCER_ATOM, {
    type: 'reset',
    value: userDefinedValues,
  });

  const fullConfig = {
    // First enter all default values as defined by the original UI files
    ...defined,
    ...userDefinedValues,
  };

  // Required extension values also apply when importing or restoring user settings.
  Object.entries(locks).forEach(([url, { lockedValue }]) => {
    fullConfig[url] = lockedValue;
  });

  // TODO: make it read only and write only to the user config
  set(CONFIGURATION_FULL_REDUCER_ATOM, {
    type: 'reset',
    value: fullConfig,
  });
}
