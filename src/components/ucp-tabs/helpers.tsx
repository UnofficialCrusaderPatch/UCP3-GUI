import { Extension } from 'config/ucp/common';
import {
  extensionsToOptionEntries,
  getConfigDefaults,
} from 'config/ucp/extension-util';
import { ExtensionsState } from 'function/global/types';

function propagateActiveExtensionsChange(
  extensionsState: ExtensionsState,
  stateFunctions: {
    setConfiguration: any;
    setConfigurationDefaults: any;
    setConfigurationTouched: any;
    setConfigurationWarnings: any;
    setConfigurationLocks: any;
  }
) {
  const {
    setConfiguration,
    setConfigurationDefaults,
    setConfigurationTouched,
    setConfigurationWarnings,
    setConfigurationLocks,
  } = stateFunctions;

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
  setConfiguration({
    type: 'reset',
    value: defaults,
  });
  setConfigurationDefaults({
    type: 'reset',
    value: defaults,
  });
  setConfigurationTouched({
    type: 'reset',
    value: Object.fromEntries(
      Object.entries(defaults).map((pair) => [pair[0], false])
    ),
  });
  // Not implemented currently. Could store them in configuration of extensionsState?
  setConfigurationWarnings({
    type: 'reset',
    value: {},
  });
  setConfigurationLocks({
    type: 'reset',
    value: locks,
  });
}

// eslint-disable-next-line import/prefer-default-export
export { propagateActiveExtensionsChange };
