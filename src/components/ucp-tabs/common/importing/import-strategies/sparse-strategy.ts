import semver from 'semver';
import { ConfigFile, Extension } from '../../../../../config/ucp/common';
import { deserializeLoadOrder } from '../../../../../config/ucp/config-files/load-order';
import {
  DependencyStatement,
  Version,
} from '../../../../../config/ucp/dependency-statement';
import { ExtensionsState } from '../../../../../function/extensions/extensions-state';
import {
  AVAILABLE_EXTENSION_VERSIONS_ATOM,
  PREFERRED_EXTENSION_VERSION_ATOM,
} from '../../../../../function/extensions/state/state';
import { getStore } from '../../../../../hooks/jotai/base';
import { MessageType } from '../../../../../localization/localization';
import { ConsoleLogger } from '../../../../../util/scripts/logging';
import { buildExtensionConfigurationDB } from '../../../extension-manager/extension-configuration/extension-configuration';
import { addExtensionToExplicityActivatedExtensions } from '../../../extension-manager/extensions-state-manipulation';
import {
  sanitizeVersionRange,
  MissingDependenciesFailure,
  GenericFailure,
  Success,
  StrategyResult,
} from './common';

function updatePreferredExtensionVersions(extensions: Extension[]) {
  // Set the new preferences for which version to use for each extension
  const newPrefs = { ...getStore().get(PREFERRED_EXTENSION_VERSION_ATOM) };

  extensions.forEach((e: Extension) => {
    newPrefs[e.name] = e.version;
  });

  getStore().set(PREFERRED_EXTENSION_VERSION_ATOM, newPrefs);
}

/**
 * Builds the new extension state and load order from the
 * sparse part of the ConfigFile. Uses setConfigStatus to
 * report on progress
 * @param newExtensionsState the new extension state to base on
 * @param config the ConfigFile to use the sparse part from
 * @param setConfigStatus the callback to report status with
 * @returns A StrategyResult object
 */
// eslint-disable-next-line import/prefer-default-export
export function sparseStrategy(
  newExtensionsState: ExtensionsState,
  config: ConfigFile,
  setConfigStatus: (message: MessageType) => void,
  repair?: boolean,
): StrategyResult {
  const { extensions } = newExtensionsState;

  // Get the current available versions database
  // This updates every time extension state changes but since no extensions will be installed during an import
  // This is fine to declare as const here.
  const availableVersionsDatabase = getStore().get(
    AVAILABLE_EXTENSION_VERSIONS_ATOM,
  );

  // TODO: don't allow fancy semver in a user configuration. Only allow it in definition.yml. Use tree logic.
  // Get the load order from the sparse part of the config file

  // BUG: this should be done on the config-full order to retain reproducibility between GUI refreshes...
  const bottomUpSparseLoadOrder = deserializeLoadOrder(
    config['config-sparse']['load-order'],
  );
  if (
    bottomUpSparseLoadOrder !== undefined &&
    bottomUpSparseLoadOrder.length > 0
  ) {
    const bottomUpExplicitActiveExtensions: Extension[] = [];

    // TODO: use tree for this part
    // eslint-disable-next-line no-restricted-syntax
    for (const dependencyStatementString of bottomUpSparseLoadOrder) {
      // Get the dependency
      const dependencyStatement = new DependencyStatement(
        dependencyStatementString.extension,
        '==',
        dependencyStatementString.version,
      );

      if (dependencyStatement.operator === '') {
        // Get the available versions for this extension name
        const availableVersions =
          availableVersionsDatabase[dependencyStatement.extension];
        if (availableVersions === undefined || availableVersions.length === 0) {
          return {
            status: 'error',
            code: 'GENERIC',
            messages: [
              `No version available for statement: ${dependencyStatement}`,
            ],
          };
        }
        dependencyStatement.operator = '==';
        // Choose the firstmost version (the highest version)
        dependencyStatement.version = Version.fromString(availableVersions[0]);
      }

      let options: Extension[] = [];

      const dependencyStatementStringSerialized = `${dependencyStatementString.extension}-${dependencyStatementString.version}`;

      try {
        // Construct a range string that semver can parse
        const rstring = sanitizeVersionRange(
          `${dependencyStatement.operator} ${dependencyStatement.version}`,
        );
        const range: semver.Range = new semver.Range(rstring, { loose: true });

        // Set of extensions that satisfy the requirement.
        options = extensions.filter(
          (ext: Extension) =>
            ext.name === dependencyStatement.extension &&
            semver.satisfies(ext.version, range),
        );

        // ConsoleLogger.debug('options', options);

        // If there are no options, we are probably missing an extension
        if (options.length === 0) {
          setConfigStatus({
            key: 'config.status.missing.extension',
            args: {
              extension: dependencyStatementStringSerialized,
            },
          });

          // Abort the import
          return {
            status: 'error',
            messages: [],
            code: 'MISSING_DEPENDENCIES',
            dependencies: [dependencyStatementStringSerialized],
          } as MissingDependenciesFailure;
        }
      } catch (err: unknown) {
        // Couldn't be parsed by semver
        const errorMsg = `Unimplemented operator in dependency statement: ${dependencyStatementStringSerialized}`;

        return {
          status: 'error',
          messages: [errorMsg],
        } as GenericFailure;
      }

      // A suitable version can be found and is pushed to the explicitly activated
      // (since we are dealing with the sparse load order here!)
      bottomUpExplicitActiveExtensions.push(
        options.sort((a, b) => semver.compare(b.version, a.version))[0],
      );
    }

    updatePreferredExtensionVersions(bottomUpExplicitActiveExtensions);

    // eslint-disable-next-line no-restricted-syntax
    for (const ext of bottomUpExplicitActiveExtensions) {
      try {
        // Add each dependency iteratively, recomputing the dependency tree as we go
        // eslint-disable-next-line no-param-reassign
        newExtensionsState = addExtensionToExplicityActivatedExtensions(
          newExtensionsState,
          ext,
          repair,
        );
      } catch (de: unknown) {
        ConsoleLogger.error(de);

        return {
          status: 'error',
          messages: [String(de)],
          code: 'GENERIC',
        } as GenericFailure;
      }
    }

    // Complete the new extension state by building the configuration DB
    // eslint-disable-next-line no-param-reassign
    newExtensionsState = buildExtensionConfigurationDB(newExtensionsState);
  }

  return {
    newExtensionsState,
    status: 'ok',
  } as Success;
}
