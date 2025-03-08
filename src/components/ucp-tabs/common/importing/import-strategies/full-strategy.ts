import semver from 'semver';
import { ConfigFile, Extension } from '../../../../../config/ucp/common';
import { deserializeLoadOrder } from '../../../../../config/ucp/config-files/load-order';
import { ExtensionsState } from '../../../../../function/extensions/extensions-state';
import { MessageType } from '../../../../../localization/localization';
import { buildExtensionConfigurationDB } from '../../../../../function/configuration/extension-configuration/build-extension-configuration-db';
import {
  GenericFailure,
  LOGGER,
  MissingDependenciesFailure,
  MissingLoadOrderFailure,
  sanitizeVersionRange,
  StrategyResult,
  Success,
} from './common';

/**
 * Builds the new extension state and load order from the
 * full part of the ConfigFile. Uses setConfigStatus to
 * report on progress.
 *
 * @note Key difference with sparse version is that
 * the preferred used version of an extension is not set.
 * @param newExtensionsState the new extension state to base on
 * @param config the ConfigFile to use the full part from
 * @param setConfigStatus the callback to report status with
 * @returns A StrategyResult object
 */
// eslint-disable-next-line import/prefer-default-export
export function fullStrategy(
  newExtensionsState: ExtensionsState,
  config: ConfigFile,
  setConfigStatus: (message: MessageType) => void,
): StrategyResult {
  const { extensions } = newExtensionsState;

  // TODO: don't allow fancy semver in a user configuration. Only allow it in definition.yml. Use tree logic.
  // Get the load order from the sparse part of the config file

  if (config['config-full'] === undefined) {
    return {
      status: 'error',
      messages: ['no config-full present'],
    } as GenericFailure;
  }

  const loadOrder = deserializeLoadOrder(config['config-full']['load-order']);
  if (loadOrder !== undefined && loadOrder.length > 0) {
    const loadOrderActiveExtensions: Extension[] = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const dependencyStatementString of loadOrder) {
      let options: Extension[] = [];

      const dependencyStatementStringSerialized = `${dependencyStatementString.extension}-${dependencyStatementString.version}`;

      // Construct a range string that semver can parse
      const versionIsEqualString = `=${sanitizeVersionRange(
        dependencyStatementString.version,
      )}`;
      const isEqualRange: semver.Range = new semver.Range(
        versionIsEqualString,
        {
          loose: true,
        },
      );

      // Set of extensions that satisfy the requirement.
      options = extensions.filter(
        (ext: Extension) =>
          ext.name === dependencyStatementString.extension &&
          semver.satisfies(ext.version, isEqualRange),
      );

      // ConsoleLogger.debug('options', options);

      // If there are no options, we are probably missing an extension
      if (options.length !== 1) {
        LOGGER.msg(`options: ${options.length}`).warn();
        LOGGER.msg(
          `Missing extension? Could not import configuration. Missing extension: ${dependencyStatementStringSerialized}`,
        ).error();
        setConfigStatus('missing dependencies');
        // Abort the import
        return {
          status: 'error',
          messages: [],
          code: 'MISSING_DEPENDENCIES',
          dependencies: [dependencyStatementStringSerialized],
        } as MissingDependenciesFailure;
      }

      // A suitable version can be found and is pushed to the activated extensions
      // This is a bit silly because options will always be of length 1 or 0 in this strategy...
      loadOrderActiveExtensions.push(options[0]);
    }

    // Now we use the sparse order to set the explicitly active extensions
    const sparseLoadOrder = deserializeLoadOrder(
      config['config-sparse']['load-order'],
    );

    const installedExtensionsCopy =
      newExtensionsState.installedExtensions.slice();
    const bottomUpActiveExtensions: Extension[] = [];
    const bottomUpExplicitlyActiveExtensions: Extension[] = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const ext of loadOrderActiveExtensions) {
      try {
        if (
          sparseLoadOrder
            .map(({ extension }) => extension)
            .indexOf(ext.name) !== -1
        ) {
          // Is an explicitly activated extension
          bottomUpExplicitlyActiveExtensions.push(ext);

          // Check if all its dependencies have been loaded
          const missingExtensionNames = Object.entries(
            ext.definition.dependencies,
          )
            .filter(
              ([name, range]) =>
                bottomUpActiveExtensions.filter(
                  (e) =>
                    name === e.name &&
                    semver.satisfies(e.definition.version, range),
                ).length === 0,
            )
            .map(([name]) => name)
            .filter((name) => ['frontend', 'framework'].indexOf(name) === -1);

          if (missingExtensionNames.length > 0) {
            const msg2 = missingExtensionNames.join(' ');
            LOGGER.msg(`Missing extensions: ${msg2}`).warn();
            LOGGER.msg(
              `Dependencies definition changed? Could not import configuration. Missing extension(s): ${msg2}`,
            ).error();
            setConfigStatus('missing dependencies');
            // Abort the import
            return {
              status: 'error',
              messages: [],
              code: 'MISSING_DEPENDENCIES_OR_WRONG_ORDER',
              dependencies: [msg2],
            } as MissingDependenciesFailure;
          }
        }
        bottomUpActiveExtensions.push(ext);
        installedExtensionsCopy.splice(installedExtensionsCopy.indexOf(ext), 1);
      } catch (de: unknown) {
        LOGGER.msg(String(de)).error();

        return {
          status: 'error',
          messages: [String(de)],
        } as GenericFailure;
      }
    }

    // Complete the new extension state by building the configuration DB
    // eslint-disable-next-line no-param-reassign
    newExtensionsState = buildExtensionConfigurationDB({
      ...newExtensionsState,
      activeExtensions: bottomUpActiveExtensions.slice().reverse(),
      installedExtensions: installedExtensionsCopy,
      explicitlyActivatedExtensions: bottomUpExplicitlyActiveExtensions
        .slice()
        .reverse(),
    });
  } else {
    return {
      status: 'error',
      code: 'MISSING_LOAD_ORDER',
      messages: ['no full "load-order" found in config file'],
    } as MissingLoadOrderFailure;
  }

  return {
    newExtensionsState,
    status: 'ok',
  } as Success;
}
