import { showGeneralModalOkCancel } from 'components/modals/ModalOkCancel';
import { Extension } from 'config/ucp/common';
import ExtensionDependencySolver from 'config/ucp/extension-dependency-solver';
import {
  GeneralOkCancelModalWindow,
  ExtensionsState,
  KeyValueReducerArgs,
  Warning,
} from 'function/global/types';
import { ConfigurationLock } from 'function/global/global-atoms';
import warnClearingOfConfiguration from '../common/WarnClearingOfConfiguration';
import { buildExtensionConfigurationDB } from './extension-configuration';
import { addExtensionToExplicityActivatedExtensions } from './extensions-state';
import { propagateActiveExtensionsChange } from '../helpers';

const inactiveExtensionElementClickCallback = async (
  configurationTouched: { [key: string]: boolean },
  generalOkCancelModalWindow: GeneralOkCancelModalWindow,
  setGeneralOkCancelModalWindow: (arg0: GeneralOkCancelModalWindow) => void,
  extensionsState: ExtensionsState,
  eds: ExtensionDependencySolver,
  extensionsByName: { [k: string]: Extension },
  extensionsByNameVersionString: { [k: string]: Extension },
  ext: Extension,
  setExtensionsState: (arg0: ExtensionsState) => void,
  setConfiguration: (args_0: KeyValueReducerArgs<unknown>) => void,
  setConfigurationDefaults: (args_0: KeyValueReducerArgs<unknown>) => void,
  setConfigurationTouched: (args_0: KeyValueReducerArgs<boolean>) => void,
  setConfigurationWarnings: (args_0: KeyValueReducerArgs<Warning>) => void,
  setConfigurationLocks: (
    args_0: KeyValueReducerArgs<ConfigurationLock | boolean>
  ) => void
) => {
  // TODO: include a check where it checks whether the right version of an extension is available and selected (version dropdown box)

  const confirmed = await warnClearingOfConfiguration(configurationTouched);

  if (!confirmed) {
    return;
  }

  const newExtensionState = addExtensionToExplicityActivatedExtensions(
    extensionsState,
    eds,
    extensionsByName,
    extensionsByNameVersionString,
    ext
  );

  const res = buildExtensionConfigurationDB(newExtensionState);

  if (res.configuration.statusCode !== 0) {
    if (res.configuration.statusCode === 2) {
      const confirmed1 = await showGeneralModalOkCancel({
        title: 'Error',
        message: `Invalid extension configuration. New configuration has ${res.configuration.errors.length} errors. Try to proceed anyway?`,
      });
      if (confirmed1) return;
    }
    const confirmed2 = await showGeneralModalOkCancel({
      title: 'Warning',
      message: `Be warned, new configuration has ${res.configuration.warnings.length} warnings. Proceed anyway?`,
    });
    if (confirmed2) return;
  } else {
    console.log(`New configuration build without errors or warnings`);
  }

  propagateActiveExtensionsChange(res);

  setExtensionsState(res);
  console.log('New extension state', res);
};

export default inactiveExtensionElementClickCallback;
