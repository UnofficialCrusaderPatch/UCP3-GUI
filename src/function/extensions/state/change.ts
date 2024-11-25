import { Getter, Setter } from 'jotai';
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
  const { defined } = extensionsState.configuration;
  const userDefinedValues = get(CONFIGURATION_USER_REDUCER_ATOM);

  const fullConfig = {
    // First enter all default values as defined by the original UI files
    ...defined,
    ...userDefinedValues,
  };

  // TODO: make it read only and write only to the user config
  set(CONFIGURATION_FULL_REDUCER_ATOM, {
    type: 'reset',
    value: fullConfig,
  });
}
