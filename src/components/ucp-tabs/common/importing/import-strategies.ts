import * as semver from 'semver';
import { ConfigFile, Extension } from '../../../../config/ucp/common';
import { deserializeLoadOrder } from '../../../../config/ucp/config-files/load-order';
import {
  DependencyStatement,
  Version,
} from '../../../../config/ucp/dependency-statement';
import Logger, { ConsoleLogger } from '../../../../util/scripts/logging';
import { showModalOk } from '../../../modals/modal-ok';
import { buildExtensionConfigurationDB } from '../../extension-manager/extension-configuration';
import { addExtensionToExplicityActivatedExtensions } from '../../extension-manager/extensions-state-manipulation';
import { ExtensionsState } from '../../../../function/extensions/extensions-state';
import {
  AVAILABLE_EXTENSION_VERSIONS_ATOM,
  PREFERRED_EXTENSION_VERSION_ATOM,
} from '../../../../function/extensions/state/state';
import { getStore } from '../../../../hooks/jotai/base';
import { Message } from '../../../../localization/localization';

const LOGGER = new Logger('import-strategies.ts');

export function sanitizeVersionRange(rangeString: string) {
  if (rangeString.indexOf('==') !== -1) {
    return rangeString.replaceAll('==', '');
  }
  return rangeString;
}

function updatePreferredExtensionVersions(extensions: Extension[]) {
  // Set the new preferences for which version to use for each extension
  const newPrefs = { ...getStore().get(PREFERRED_EXTENSION_VERSION_ATOM) };

  extensions.forEach((e: Extension) => {
    newPrefs[e.name] = e.version;
  });

  getStore().set(PREFERRED_EXTENSION_VERSION_ATOM, newPrefs);
}

export type Success = {
  status: 'ok';
  newExtensionsState: ExtensionsState;
};

type GenericFailure = {
  status: 'error';
  messages: string[];
  code: 'GENERIC';
};

type MissingDependenciesFailure = {
  status: 'error';
  messages: string[];
  code: 'MISSING_DEPENDENCIES';
  dependencies: string[];
};

export type StrategyResult =
  | Success
  | (GenericFailure | MissingDependenciesFailure);

export type Strategy = (
  newExtensionsState: ExtensionsState,
  config: ConfigFile,
  setConfigStatus: (arg0: string) => void,
) => Promise<StrategyResult>;

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
export async function sparseStrategy(
  newExtensionsState: ExtensionsState,
  config: ConfigFile,
  setConfigStatus: (message: Message) => void,
) {
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
  const loadOrder = deserializeLoadOrder(config['config-sparse']['load-order']);
  if (loadOrder !== undefined && loadOrder.length > 0) {
    const explicitActiveExtensions: Extension[] = [];

    // TODO: use tree for this part
    // eslint-disable-next-line no-restricted-syntax
    for (const dependencyStatementString of loadOrder) {
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
          // eslint-disable-next-line no-await-in-loop
          await showModalOk({
            message: `hmmm, how did we get here?`,
            title: `Illegal dependency statement`,
          });
          throw Error(`hmmm, how did we get here?`);
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

          // eslint-disable-next-line no-await-in-loop
          await showModalOk({
            message: {
              key: 'config.status.missing.extension',
              args: {
                extension: dependencyStatementStringSerialized,
              },
            },
            title: `Missing extension`,
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

        // eslint-disable-next-line no-await-in-loop
        await showModalOk({
          message: errorMsg,
          title: `Illegal dependency statement`,
        });

        return {
          status: 'error',
          messages: [errorMsg],
        } as GenericFailure;
      }

      // A suitable version can be found and is pushed to the explicitly activated
      // (since we are dealing with the sparse load order here!)
      explicitActiveExtensions.push(
        options.sort((a, b) => semver.compare(b.version, a.version))[0],
      );
    }

    updatePreferredExtensionVersions(explicitActiveExtensions);

    // Reverse the array of explicitly Active Extensions such that we deal it from the ground up (lowest dependency first)
    // eslint-disable-next-line no-restricted-syntax
    for (const ext of explicitActiveExtensions.slice().reverse()) {
      try {
        // Add each dependency iteratively, recomputing the dependency tree as we go
        // eslint-disable-next-line no-await-in-loop, no-param-reassign
        newExtensionsState = await addExtensionToExplicityActivatedExtensions(
          newExtensionsState,
          ext,
        );
      } catch (de: unknown) {
        // eslint-disable-next-line no-await-in-loop
        await showModalOk({
          message: String(de),
          title: 'Error in dependencies',
        });

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
export async function fullStrategy(
  newExtensionsState: ExtensionsState,
  config: ConfigFile,
  setConfigStatus: (message: Message) => void,
) {
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
    const activeExtensions: Extension[] = [];

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
      activeExtensions.push(options[0]);
    }

    // Now we use the sparse order to set the explicitly active extensions
    const sparseLoadOrder = deserializeLoadOrder(
      config['config-sparse']['load-order'],
    );

    const ie = newExtensionsState.installedExtensions.slice();
    const ae = [];
    const eae = [];

    // Reverse the array of explicitly Active Extensions such that we deal it from the ground up (lowest dependency first)
    // eslint-disable-next-line no-restricted-syntax
    for (const ext of activeExtensions.slice().reverse()) {
      try {
        if (
          sparseLoadOrder
            .map(({ extension }) => extension)
            .indexOf(ext.name) !== -1
        ) {
          eae.push(ext);
        }
        ae.push(ext);
        ie.splice(ie.indexOf(ext), 1);
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
      activeExtensions: ae,
      installedExtensions: ie,
      explicitlyActivatedExtensions: eae,
    });
  } else {
    return {
      status: 'error',
      code: 'GENERIC',
      messages: ['no sparse "load-order" found in config file'],
    };
  }

  return {
    newExtensionsState,
    status: 'ok',
  } as Success;
}
