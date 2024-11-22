import {
  extensionsToOptionEntries,
  getConfigDefaults,
} from '../../../config/ucp/extension-util';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../configuration/state';
import { getStore } from '../../../hooks/jotai/base';
import { ConsoleLogger } from '../../../util/scripts/logging';
import { ExtensionsState } from '../extensions-state';

// eslint-disable-next-line import/prefer-default-export
export function propagateActiveExtensionsChange(
  extensionsState: ExtensionsState,
) {
  ConsoleLogger.debug('change.tsx: extension state', extensionsState);

  // This section is meant to allow the config editor to display the options.
  const optionEntries = extensionsToOptionEntries(
    extensionsState.activeExtensions,
  );
  const uiDefinedDefaults = getConfigDefaults(optionEntries);

  // Here the values are set

  const { defined, locks, suggestions } = extensionsState.configuration;
  const userDefinedValues = getStore().get(CONFIGURATION_USER_REDUCER_ATOM);

  const fullConfig = {
    // First enter all default values as defined by the original UI files
    ...defined,
    ...userDefinedValues,
  };

  // TODO: make it read only and write only to the user config
  getStore().set(CONFIGURATION_FULL_REDUCER_ATOM, {
    type: 'reset',
    value: fullConfig,
  });

  ConsoleLogger.debug('change.tsx: active extension changed.', {
    suggestions,
    locks,
    fullConfig,
    userDefinedValues,
    uiDefinedDefaults,
    defined,
  });
}
