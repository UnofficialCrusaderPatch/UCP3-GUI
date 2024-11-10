import { Extension } from '../../../config/ucp/common';
import { getStore } from '../../../hooks/jotai/base';
import { clearConfiguration } from '../../configuration/clearConfiguration';
import { createEmptyConfigurationState } from '../../configuration/state';
import { ExtensionDependencyTree } from '../dependency-management/dependency-resolution';
import { ExtensionsState } from '../extensions-state';
import { EXTENSION_STATE_REDUCER_ATOM } from './state';

// eslint-disable-next-line import/prefer-default-export
export function createBasicExtensionsState(
  extensions: Extension[],
  frontendVersion: string | undefined,
  frameworkVersion: string | undefined,
): ExtensionsState {
  return {
    extensions,
    tree: new ExtensionDependencyTree(
      [...extensions],
      frontendVersion,
      frameworkVersion,
    ),
    onlineAvailableExtensions: [],
    activeExtensions: [],
    explicitlyActivatedExtensions: [],
    installedExtensions: [...extensions],
    configuration: createEmptyConfigurationState(),
  } as ExtensionsState;
}

export function clearConfigurationAndSetNewExtensionsState(
  newExtensionsState: ExtensionsState,
) {
  getStore().set(EXTENSION_STATE_REDUCER_ATOM, newExtensionsState);

  // This clear needs to be after the new extension state is set
  // Otherwise the GUI tries to use default values that have been wiped
  clearConfiguration();
}
