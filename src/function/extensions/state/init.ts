import { Extension } from '../../../config/ucp/common';
import { createEmptyConfigurationState } from '../../configuration/state';
import { ExtensionDependencyTree } from '../dependency-management/dependency-resolution';
import { ExtensionsState } from '../extensions-state';

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
