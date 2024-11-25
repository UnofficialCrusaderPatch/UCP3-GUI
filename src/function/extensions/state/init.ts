import { Extension } from '../../../config/ucp/common';
import { getStore } from '../../../hooks/jotai/base';
import { clearConfiguration } from '../../configuration/clearConfiguration';
import { createEmptyConfigurationState } from '../../configuration/state';
import { ExtensionDependencyTree } from '../dependency-management/dependency-resolution';
import { ExtensionsState } from '../extensions-state';
import {
  EXTENSION_STATE_REDUCER_ATOM,
  PREFERRED_EXTENSION_VERSION_ATOM,
} from './state';

/**
 * Note this function returns a state with all extensions inactive
 * @param extensions list of extensions to include in the state, no extensions are active
 * @param frontendVersion the frontend version to support
 * @param frameworkVersion the framework version to support
 * @returns extensions state object
 */
// eslint-disable-next-line import/prefer-default-export
export function createBasicExtensionsState(
  extensions: Extension[],
  frontendVersion: string | undefined,
  frameworkVersion: string | undefined,
): ExtensionsState {
  return {
    extensions: [...extensions],
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

export function setExtensionsStateAndClearConfiguration(
  newExtensionsState: ExtensionsState,
) {
  getStore().set(EXTENSION_STATE_REDUCER_ATOM, newExtensionsState);
  getStore().set(PREFERRED_EXTENSION_VERSION_ATOM, {});
  // This clear needs to be after the new extension state is set
  // Otherwise the GUI tries to use default values that have been wiped
  clearConfiguration();
}
