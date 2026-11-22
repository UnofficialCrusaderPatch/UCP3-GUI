import { Getter, Setter } from 'jotai';
import {
  applyRequiredValueRepairs,
  conflictingRequirements,
} from '../../configuration/required-value-repairs';
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
  const { defined, locks, overrides } = extensionsState.configuration;

  // Repair persisted overrides as well as the effective configuration. Otherwise
  // removing a requirement would silently restore the conflicting preference.
  // Callers that change the active extensions confirm these repairs first.
  // A setting that two extensions require differently is an error state; the
  // player's stored value is not replaced by either requirement.
  const userDefinedValues = applyRequiredValueRepairs(
    get(CONFIGURATION_USER_REDUCER_ATOM),
    locks,
    conflictingRequirements(overrides ?? new Map()),
  );
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
