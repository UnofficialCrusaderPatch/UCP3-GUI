import { ConfigMetaObject } from '../../../config/ucp/config-merge/objects';
import {
  extensionsToOptionEntries,
  getConfigDefaults,
} from '../../../config/ucp/extension-util';
import {
  ConfigurationSuggestion,
  CONFIGURATION_LOCKS_REDUCER_ATOM,
  ConfigurationLock,
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_SUGGESTIONS_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../configuration/state';
import { getStore } from '../../../hooks/jotai/base';
import { ConsoleLogger } from '../../../util/scripts/logging';
import { ExtensionsState } from '../extensions-state';

function propagateActiveExtensionsChange(extensionsState: ExtensionsState) {
  ConsoleLogger.debug('change.tsx: extension state', extensionsState);

  ConsoleLogger.debug(
    'change.tsx: Updating full config based on active extensions: ',
    extensionsState.activeExtensions,
  );

  // This section is meant to allow the config editor to display the options.
  const optionEntries = extensionsToOptionEntries(
    extensionsState.activeExtensions,
  );
  const uiDefinedDefaults = getConfigDefaults(optionEntries);

  ConsoleLogger.debug(
    'change.tsx: settings defined by the UI: ',
    uiDefinedDefaults,
  );

  const locks: { [key: string]: ConfigurationLock } = {};
  const suggestions: { [url: string]: ConfigurationSuggestion } = {};

  // This small section is meant to process the extensions and create an improved default configuration based on active extensions
  // TODO: make this rely on the extension state?

  const configDefinedValues: Record<string, unknown> = {};
  ConsoleLogger.debug(
    'change.tsx: config defined values as passed from extension State',
    extensionsState.configuration.state,
  );
  Object.entries(extensionsState.configuration.state).forEach(
    ([url, cmo]: [string, ConfigMetaObject]) => {
      configDefinedValues[url] = cmo.modifications.value.content;
      if (cmo.modifications.value.qualifier === 'required') {
        locks[url] = {
          lockedBy: cmo.modifications.value.entity,
          lockedValue: cmo.modifications.value.content,
        };
      } else if (
        cmo.modifications.value.qualifier === 'suggested' ||
        cmo.modifications.value.qualifier === 'unspecified'
      ) {
        suggestions[url] = {
          suggestedBy: cmo.modifications.value.entity,
          suggestedValue: cmo.modifications.value.content,
        };
      }
    },
  );

  // Here the values are set

  const extensionsDefinedValues = {
    ...uiDefinedDefaults,
    ...configDefinedValues,
  };
  const userDefinedValues = getStore().get(CONFIGURATION_USER_REDUCER_ATOM);

  const fullConfig = {
    // First enter all default values as defined by the original UI files
    ...uiDefinedDefaults,
    ...configDefinedValues,
    ...userDefinedValues,
  };

  ConsoleLogger.debug('change.tsx: extensions defined config');
  ConsoleLogger.debug(extensionsDefinedValues);

  getStore().set(CONFIGURATION_DEFAULTS_REDUCER_ATOM, {
    type: 'reset',
    value: extensionsDefinedValues,
  });

  ConsoleLogger.debug('change.tsx: user config');
  ConsoleLogger.debug(userDefinedValues);

  ConsoleLogger.debug('change.tsx: full config');
  ConsoleLogger.debug(fullConfig);

  getStore().set(CONFIGURATION_FULL_REDUCER_ATOM, {
    type: 'reset',
    value: fullConfig,
  });

  ConsoleLogger.debug('change.tsx: locks on the config');
  ConsoleLogger.debug(locks);

  getStore().set(CONFIGURATION_LOCKS_REDUCER_ATOM, {
    type: 'reset',
    value: locks,
  });

  ConsoleLogger.debug('change.tsx: suggestions in the config');
  ConsoleLogger.debug(suggestions);

  getStore().set(CONFIGURATION_SUGGESTIONS_REDUCER_ATOM, {
    type: 'reset',
    value: suggestions,
  });
}

// eslint-disable-next-line import/prefer-default-export
export { propagateActiveExtensionsChange };
