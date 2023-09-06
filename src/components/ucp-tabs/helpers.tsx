import { Extension } from 'config/ucp/common';
import {
  extensionsToOptionEntries,
  getConfigDefaults,
} from 'config/ucp/extension-util';
import {
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_LOCKS_REDUCER_ATOM,
  CONFIGURATION_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_WARNINGS_REDUCER_ATOM,
  ConfigurationLock,
} from 'function/global/global-atoms';
import {
  ExtensionsState,
  KeyValueReducerArgs,
  Warning,
} from 'function/global/types';
import { getStore } from 'hooks/jotai/base';

function propagateActiveExtensionsChange(extensionsState: ExtensionsState) {
  // This section is meant to allow the config editor to display the options.
  const optionEntries = extensionsToOptionEntries(
    extensionsState.activeExtensions
  );
  const defaults = getConfigDefaults(optionEntries);

  console.log(`Updating defaults based on imported extensions:`);
  console.log(extensionsState.activeExtensions);
  console.log('Default settings: ');
  console.log(defaults);

  const locks: { [key: string]: boolean } = {};

  // This small section is meant to process the extensions and create an improved default configuration based on active extensions
  // TODO: make this rely on the extension state?
  Object.entries(extensionsState.configuration.state).forEach(([url, cmo]) => {
    defaults[url] = cmo.modifications.value.content;
    if (cmo.modifications.value.qualifier === 'required') {
      locks[url] = true;
    }
  });

  // Here the values are set
  getStore().set(CONFIGURATION_REDUCER_ATOM, {
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
      Object.entries(defaults).map((pair) => [pair[0], false])
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
}

// eslint-disable-next-line import/prefer-default-export
export { propagateActiveExtensionsChange };
