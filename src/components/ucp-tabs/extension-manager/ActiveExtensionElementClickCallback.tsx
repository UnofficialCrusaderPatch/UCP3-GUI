import { ExtensionsState } from 'function/global/types';
import { Extension } from 'config/ucp/common';
import warnClearingOfConfiguration from '../common/WarnClearingOfConfiguration';
import { removeExtensionFromExplicitlyActivatedExtensions } from './extensions-state';

const activeExtensionElementClickCallback = async (
  configurationTouched: { [key: string]: boolean },
  extensionsState: ExtensionsState,
  setExtensionsState: (arg0: ExtensionsState) => void,
  ext: Extension
) => {
  const confirmed = await warnClearingOfConfiguration(configurationTouched);
  if (!confirmed) {
    return;
  }
  const newExtensionState = removeExtensionFromExplicitlyActivatedExtensions(
    extensionsState,
    ext
  );
  const ae = newExtensionState.activeExtensions;

  setExtensionsState(newExtensionState);
};

export default activeExtensionElementClickCallback;
