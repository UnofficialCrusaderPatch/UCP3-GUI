import * as semver from 'semver';
import { TFunction } from 'i18next';
import {
  ConfigurationQualifier,
  CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../function/configuration/state';
import { ExtensionsState } from '../../../function/extensions/extensions-state';
import { openFileDialog } from '../../../tauri/tauri-dialog';
import { getStore } from '../../../hooks/jotai/base';

import {
  ConfigFile,
  Extension,
  ConfigEntry,
  ConfigFileExtensionEntry,
} from '../../../config/ucp/common';
import { loadConfigFromFile } from '../../../config/ucp/config-files';
import { ConfigMetaObjectDB } from '../../../config/ucp/config-merge/objects';
import {
  DependencyStatement,
  Version,
} from '../../../config/ucp/dependency-statement';
import { collectConfigEntries } from '../../../function/extensions/discovery/discovery';

import {
  AVAILABLE_EXTENSION_VERSIONS_ATOM,
  PREFERRED_EXTENSION_VERSION_ATOM,
  EXTENSION_STATE_INTERFACE_ATOM,
  EXTENSION_STATE_REDUCER_ATOM,
} from '../../../function/extensions/state/state';
import { showModalOk } from '../../modals/modal-ok';
import { ConsoleLogger } from '../../../util/scripts/logging';
import {
  buildExtensionConfigurationDB,
  buildConfigMetaContentDB,
} from '../extension-manager/extension-configuration';
import { addExtensionToExplicityActivatedExtensions } from '../extension-manager/extensions-state-manipulation';
import warnClearingOfConfiguration from './warn-clearing-of-configuration';

export const sanitizeVersionRange = (rangeString: string) => {
  if (rangeString.indexOf('==') !== -1) {
    return rangeString.replaceAll('==', '');
  }
  return rangeString;
};

const updatePreferredExtensionVersions = (
  explicitActiveExtensions: Extension[],
) => {
  // Set the new preferences for which version to use for each extension
  const newPrefs = { ...getStore().get(PREFERRED_EXTENSION_VERSION_ATOM) };

  explicitActiveExtensions.forEach((e: Extension) => {
    newPrefs[e.name] = e.version;
  });

  getStore().set(PREFERRED_EXTENSION_VERSION_ATOM, newPrefs);
};

const importButtonCallback = async (
  gameFolder: string,
  setConfigStatus: (arg0: string) => void,
  t: TFunction<[string, string], undefined>,
  file: string | undefined,
) => {
  // Get the current available versions database
  // This updates every time extension state changes but since no extensions will be installed during an import
  // This is fine to declare as const here.
  const availableVersionsDatabase = getStore().get(
    AVAILABLE_EXTENSION_VERSIONS_ATOM,
  );

  // Get the current extension state
  const extensionsState = getStore().get(EXTENSION_STATE_REDUCER_ATOM);

  ConsoleLogger.debug('state before importbuttoncallback', extensionsState);

  const { extensions } = extensionsState;

  // Get which elements have been touched
  const configurationTouched = getStore().get(
    CONFIGURATION_TOUCHED_REDUCER_ATOM,
  );

  let path = file;

  // If source file hasn't been specified, open up a dialog to specify it.
  if (file === undefined || file.length === 0) {
    const pathResult = await openFileDialog(gameFolder, [
      {
        name: t('gui-general:file.config'),
        extensions: ['yml', 'yaml'],
      },
      { name: t('gui-general:file.all'), extensions: ['*'] },
    ]);
    if (pathResult.isEmpty()) {
      setConfigStatus(t('gui-editor:config.status.no.file'));
      return;
    }

    path = pathResult.get();
  }

  // The user cancelled the action
  if (path === undefined) return;

  // Warn clearing of configuration because of touched configuration values
  // Before importing was initialized.
  const clearingConfirmation =
    await warnClearingOfConfiguration(configurationTouched);
  if (!clearingConfirmation) return;

  // Create a new extension state by setting the active Extensions and explicitly active extensions to empty arrays
  // Also wipe the current configuration and rebuild it from scratch
  let newExtensionsState = {
    ...extensionsState,
    activeExtensions: [],
    explicitlyActivatedExtensions: [],
    configuration: {
      state: {},
      warnings: [],
      errors: [],
      statusCode: 0,
    },
  } as ExtensionsState;

  // Parse the config file
  const parsingResult: {
    status: string;
    message: string;
    result: ConfigFile;
  } = await loadConfigFromFile(path, t);

  ConsoleLogger.debug(`Parsing result: `, parsingResult);

  if (parsingResult.status !== 'OK') {
    setConfigStatus(`${parsingResult.status}: ${parsingResult.message}`);
    return;
  }

  if (parsingResult.result === undefined) {
    setConfigStatus(t('gui-editor:config.status.failed.unknown'));
    return;
  }

  const config = parsingResult.result;

  // Get the load order from the sparse part of the config file
  const loadOrder = config['config-sparse']['load-order'];
  if (loadOrder !== undefined && loadOrder.length > 0) {
    const explicitActiveExtensions: Extension[] = [];

    // eslint-disable-next-line no-restricted-syntax
    for (const dependencyStatementString of loadOrder) {
      // Get the dependency
      const dependencyStatement = DependencyStatement.fromString(
        dependencyStatementString,
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

        ConsoleLogger.debug('options', options);

        // If there are no options, we are probably missing an extension
        if (options.length === 0) {
          setConfigStatus(
            t('gui-editor:config.status.missing.extension', {
              extension: dependencyStatementString,
            }),
          );

          // eslint-disable-next-line no-await-in-loop
          await showModalOk({
            message: t('gui-editor:config.status.missing.extension', {
              extension: dependencyStatementString,
            }),
            title: `Missing extension`,
          });

          // Abort the import
          return;
        }
      } catch (err: any) {
        // Couldn't be parsed by semver
        const errorMsg = `Unimplemented operator in dependency statement: ${dependencyStatementString}`;

        // eslint-disable-next-line no-await-in-loop
        await showModalOk({
          message: errorMsg,
          title: `Illegal dependency statement`,
        });

        return;
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
        // eslint-disable-next-line no-await-in-loop
        newExtensionsState = await addExtensionToExplicityActivatedExtensions(
          newExtensionsState,
          ext,
        );
      } catch (de: any) {
        // eslint-disable-next-line no-await-in-loop
        await showModalOk({
          message: de.toString(),
          title: 'Error in dependencies',
        });

        return;
      }
    }

    // Complete the new extension state by building the configuration DB
    newExtensionsState = buildExtensionConfigurationDB(newExtensionsState);
  }

  ConsoleLogger.debug('opened config', parsingResult.result);

  let userConfigEntries: { [key: string]: ConfigEntry } = {};

  const parseEntry = ([extensionName, data]: [
    string,
    {
      config: ConfigFileExtensionEntry;
    },
  ]) => {
    const result = collectConfigEntries(
      data.config as {
        [key: string]: unknown;
        contents: unknown;
      },
      extensionName,
    );

    userConfigEntries = { ...userConfigEntries, ...result };
  };

  Object.entries(config['config-sparse'].modules).forEach(parseEntry);
  Object.entries(config['config-sparse'].plugins).forEach(parseEntry);

  ConsoleLogger.debug('parsed user config entries: ', userConfigEntries);

  const userConfigDB: ConfigMetaObjectDB = {};

  const newConfigurationQualifier: {
    [key: string]: ConfigurationQualifier;
  } = {};

  Object.entries(userConfigEntries).forEach(([url, data]) => {
    const m = buildConfigMetaContentDB('user', data);
    userConfigDB[url] = {
      url,
      modifications: m,
    };
    // TODO: do checking here if the user part is not conflicting?

    let q = m.value.qualifier;
    if (q === 'unspecified') q = 'suggested';
    newConfigurationQualifier[url] = q as ConfigurationQualifier;
  });

  const newUserConfiguration: { [key: string]: unknown } = {};
  const newConfigurationTouched: { [key: string]: boolean } = {};

  Object.entries(userConfigDB).forEach(([url, cmo]) => {
    // Set the user configuration value
    newUserConfiguration[url] = cmo.modifications.value.content;

    // Set this to touched as if the person has touched it?
    // TODO: I don't think this fits the new definition of "touched"
    // newConfigurationTouched[url] = true;
  });

  getStore().set(CONFIGURATION_USER_REDUCER_ATOM, {
    type: 'set-multiple',
    value: newUserConfiguration,
  });
  getStore().set(CONFIGURATION_TOUCHED_REDUCER_ATOM, {
    type: 'set-multiple',
    value: newConfigurationTouched,
  });
  getStore().set(CONFIGURATION_QUALIFIER_REDUCER_ATOM, {
    type: 'set-multiple',
    value: newConfigurationQualifier,
  });

  ConsoleLogger.debug(
    'import-button-callback.tsx: new extension state',
    newExtensionsState,
  );
  // Set the new extension state, which fires an update of the full config
  getStore().set(EXTENSION_STATE_INTERFACE_ATOM, newExtensionsState);
};

export default importButtonCallback;
