import { Extension } from 'config/ucp/common';
import {
  extensionsToOptionEntries,
  getConfigDefaults,
} from 'config/ucp/extension-util';
import { ExtensionsState } from 'function/global/types';

function propagateActiveExtensionsChange(
  activeExtensions: Extension[],
  stateFunctions: {
    extensionsState: ExtensionsState;
    setExtensionsState: any;
    setConfiguration: any;
    setConfigurationDefaults: any;
    setConfigurationTouched: any;
    setConfigurationWarnings: any;
    setConfigurationLocks: any;
  }
) {
  const {
    extensionsState,
    setExtensionsState,
    setConfiguration,
    setConfigurationDefaults,
    setConfigurationTouched,
    setConfigurationWarnings,
    setConfigurationLocks,
  } = stateFunctions;

  // This section is meant to allow the config editor to display the options.
  const optionEntries = extensionsToOptionEntries(activeExtensions);
  const defaults = getConfigDefaults(optionEntries);

  console.log(`Updating defaults based on imported extensions:`);
  console.log(activeExtensions);
  console.log('Default settings: ');
  console.log(defaults);

  const locks: { [key: string]: boolean } = {};

  // This small section is meant to process the extensions and create an improved default configuration based on active extensions
  activeExtensions
    .slice()
    .reverse()
    .forEach((ext: Extension) => {
      Object.entries(ext.configEntries).forEach((pair) => {
        const [url, value] = pair;
        defaults[url] = value;
        locks[url] = true;
      });
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
  setConfigurationWarnings({
    type: 'reset',
    value: {},
  });
  setConfigurationLocks({
    type: 'reset',
    value: locks,
  });
  // // All extensions that are not active are deemed inactive...
  // const inactiveExtensions = extensionsState.extensions.filter(
  //   (e: Extension) =>
  //     activeExtensions
  //       .map((ex: Extension) => `${ex.name}-${ex.version}`)
  //       .indexOf(`${e.name}-${e.version}`) === -1
  // );
  setExtensionsState({
    ...extensionsState,
    activeExtensions,
    // installedExtensions: inactiveExtensions,
  });
}

// eslint-disable-next-line import/prefer-default-export
export { propagateActiveExtensionsChange };
