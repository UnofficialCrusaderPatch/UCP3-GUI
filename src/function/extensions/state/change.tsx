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
  CONFIGURATION_WARNINGS_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_SUGGESTIONS_REDUCER_ATOM,
} from '../../configuration/state';
import { getStore } from '../../../hooks/jotai/base';
import { ConsoleLogger } from '../../../util/scripts/logging';
import { ExtensionsState } from '../extensions-state';

function propagateActiveExtensionsChange(extensionsState: ExtensionsState) {
  // This section is meant to allow the config editor to display the options.
  const optionEntries = extensionsToOptionEntries(
    extensionsState.activeExtensions,
  );
  const defaults = getConfigDefaults(optionEntries);

  ConsoleLogger.debug(
    'Updating defaults based on imported extensions: ',
    extensionsState.activeExtensions,
    'Default settings: ',
    defaults,
  );

  const locks: { [key: string]: ConfigurationLock } = {};
  const suggestions: { [url: string]: ConfigurationSuggestion } = {};

  // This small section is meant to process the extensions and create an improved default configuration based on active extensions
  // TODO: make this rely on the extension state?
  Object.entries(extensionsState.configuration.state).forEach(
    ([url, cmo]: [string, ConfigMetaObject]) => {
      defaults[url] = cmo.modifications.value.content;
      if (
        cmo.modifications.value.qualifier === 'required' ||
        cmo.modifications.value.qualifier === 'unspecified'
      ) {
        locks[url] = {
          lockedBy: cmo.modifications.value.entity,
          lockedValue: cmo.modifications.value.content,
        };
      } else if (cmo.modifications.value.qualifier === 'suggested') {
        suggestions[url] = {
          suggestedBy: cmo.modifications.value.entity,
          suggestedValue: cmo.modifications.value.content,
        };
      }
    },
  );

  // Here the values are set
  getStore().set(CONFIGURATION_FULL_REDUCER_ATOM, {
    type: 'reset',
    value: defaults,
  });
  getStore().set(CONFIGURATION_DEFAULTS_REDUCER_ATOM, {
    type: 'reset',
    value: defaults,
  });
  getStore().set(CONFIGURATION_TOUCHED_REDUCER_ATOM, {
    type: 'reset',
    value: Object.fromEntries(
      Object.entries(defaults).map((pair) => [pair[0], false]),
    ),
  });
  // Not implemented currently. Could store them in configuration of extensionsState?
  getStore().set(CONFIGURATION_WARNINGS_REDUCER_ATOM, {
    type: 'reset',
    value: {},
  });
  getStore().set(CONFIGURATION_LOCKS_REDUCER_ATOM, {
    type: 'reset',
    value: locks,
  });
  getStore().set(CONFIGURATION_SUGGESTIONS_REDUCER_ATOM, {
    type: 'reset',
    value: suggestions,
  });
}

// eslint-disable-next-line import/prefer-default-export
export { propagateActiveExtensionsChange };
