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

  // This section is meant to allow the config editor to display the options.
  const optionEntries = extensionsToOptionEntries(
    extensionsState.activeExtensions,
  );
  const uiDefinedDefaults = getConfigDefaults(optionEntries);

  const locks: { [key: string]: ConfigurationLock } = {};
  const suggestions: { [url: string]: ConfigurationSuggestion } = {};

  // This small section is meant to process the extensions and create an improved default configuration based on active extensions
  // TODO: make this rely on the extension state?

  const configDefinedValues: Record<string, unknown> = {};

  Object.entries(extensionsState.configuration.state).forEach(
    ([url, cmo]: [string, ConfigMetaObject]) => {
      configDefinedValues[url] = cmo.modifications.value.content;
      if (cmo.modifications.value.qualifier === 'required') {
        locks[url] = {
          lockedBy: cmo.modifications.value.entityName,
          lockedValue: cmo.modifications.value.content,
        };
      } else if (
        cmo.modifications.value.qualifier === 'suggested' ||
        cmo.modifications.value.qualifier === 'unspecified'
      ) {
        suggestions[url] = {
          suggestedBy: cmo.modifications.value.entityName,
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

  getStore().set(CONFIGURATION_DEFAULTS_REDUCER_ATOM, {
    type: 'reset',
    value: extensionsDefinedValues,
  });

  getStore().set(CONFIGURATION_FULL_REDUCER_ATOM, {
    type: 'reset',
    value: fullConfig,
  });

  getStore().set(CONFIGURATION_LOCKS_REDUCER_ATOM, {
    type: 'reset',
    value: locks,
  });

  getStore().set(CONFIGURATION_SUGGESTIONS_REDUCER_ATOM, {
    type: 'reset',
    value: suggestions,
  });

  ConsoleLogger.debug('change.tsx: active extension changed.', {
    suggestions,
    locks,
    fullConfig,
    userDefinedValues,
    uiDefinedDefaults,
    configDefinedValues,
  });
}

// eslint-disable-next-line import/prefer-default-export
export { propagateActiveExtensionsChange };
