import semver from 'semver';
import { ConfigEntry, Extension } from '../config/ucp/common';
import { UCP3SerializedDefinition } from '../config/ucp/config-files/config-files';
import {
  ConfigurationState,
  createEmptyConfigurationState,
} from '../function/configuration/state';
import { ExtensionDependencyTree } from '../function/extensions/dependency-management/dependency-resolution';
import { ExtensionsState } from '../function/extensions/extensions-state';

export type SimplifiedSerializedExtension = {
  name: string;
  version: string;
  type: string;
  definition: UCP3SerializedDefinition;
  configEntries: { [key: string]: ConfigEntry };
};

export type SimplifiedSerializedExtensionsState = {
  extensions: SimplifiedSerializedExtension[];
  installedExtensions: SimplifiedSerializedExtension[];
  activeExtensions: SimplifiedSerializedExtension[];
  onlineAvailableExtensions: SimplifiedSerializedExtension[];
  explicitlyActivatedExtensions: SimplifiedSerializedExtension[];
  configuration: ConfigurationState;
};

// eslint-disable-next-line import/prefer-default-export
export function serializeToSimplifiedExtensionsState(
  extensionsState: ExtensionsState,
) {
  const extensions: SimplifiedSerializedExtension[] =
    extensionsState.extensions.map((ext) => ({
      name: ext.name,
      version: ext.version,
      type: ext.type,
      definition: {
        ...ext.definition,
        dependencies: Object.fromEntries(
          Object.entries(ext.definition.dependencies).map((v) => [
            v[0],
            v[1].raw,
          ]),
        ),
      },
      configEntries: ext.configEntries,
    }));

  // The casts are okay-ish here
  // We just want to make sure that if underlying code updates
  // we should update this function too
  return {
    extensions,
    installedExtensions: extensions,
    activeExtensions: [],
    explicitlyActivatedExtensions: [],
    // tree: new ExtensionDependencyTree(extensions as unknown as Extension[]),
    configuration: createEmptyConfigurationState(),
    onlineAvailableExtensions: [],
  } as SimplifiedSerializedExtensionsState;
}

export function deserializeSimplifiedExtensions(
  extensions: SimplifiedSerializedExtension[],
) {
  return extensions.map((ext: SimplifiedSerializedExtension) => ({
    ...ext,
    definition: {
      ...ext.definition,
      dependencies: Object.fromEntries(
        Object.entries(ext.definition.dependencies).map(([name, version]) => [
          name,
          new semver.Range(`${version}`, { loose: true }),
        ]),
      ),
    },
  })) as Extension[];
}

export function deserializeSimplifiedSerializedExtensionsStateFromExtensions(
  serializedExtensions: SimplifiedSerializedExtension[],
) {
  const extensions = deserializeSimplifiedExtensions(serializedExtensions);
  return {
    extensions,
    installedExtensions: extensions,
    activeExtensions: [],
    explicitlyActivatedExtensions: [],
    onlineAvailableExtensions: [],
    configuration: createEmptyConfigurationState(),
    tree: new ExtensionDependencyTree(extensions, '1.0.9', '3.0.5'),
  } as ExtensionsState;
}
