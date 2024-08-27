import { TFunction } from 'i18next';
import { fullStrategy, sparseStrategy, Success } from './import-strategies';
import { collectConfigEntries } from '../../../../function/extensions/discovery/collect-config-entries';
import {
  ConfigurationQualifier,
  CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../../function/configuration/state';
import { ExtensionsState } from '../../../../function/extensions/extensions-state';
import { openFileDialog } from '../../../../tauri/tauri-dialog';
import { getStore } from '../../../../hooks/jotai/base';

import {
  ConfigFile,
  ConfigEntry,
  ConfigFileExtensionEntry,
} from '../../../../config/ucp/common';
import { loadConfigFromFile } from '../../../../config/ucp/config-files/config-files';
import { ConfigMetaObjectDB } from '../../../../config/ucp/config-merge/objects';

import {
  EXTENSION_STATE_INTERFACE_ATOM,
  EXTENSION_STATE_REDUCER_ATOM,
} from '../../../../function/extensions/state/state';
import { showModalOk } from '../../../modals/modal-ok';
import Logger, { ConsoleLogger } from '../../../../util/scripts/logging';
import { buildConfigMetaContentDBForUser } from '../../extension-manager/extension-configuration';
import warnClearingOfConfiguration from '../warn-clearing-of-configuration';
import { Override } from '../../../../function/configuration/overrides';

const LOGGER = new Logger('import-button-callback.tsx');

export function sanitizeVersionRange(rangeString: string) {
  if (rangeString.indexOf('==') !== -1) {
    return rangeString.replaceAll('==', '');
  }
  return rangeString;
}

export function constructUserConfigObjects(config: ConfigFile) {
  let userConfigEntries: { [key: string]: ConfigEntry } = {};

  function parseEntry([extensionName, data]: [
    string,
    {
      config: ConfigFileExtensionEntry;
    },
  ]) {
    const result = collectConfigEntries(
      data.config as {
        [key: string]: unknown;
        contents: unknown;
      },
      extensionName,
    );

    userConfigEntries = { ...userConfigEntries, ...result };
  }

  Object.entries(config['config-sparse'].modules).forEach(parseEntry);
  Object.entries(config['config-sparse'].plugins).forEach(parseEntry);

  // ConsoleLogger.debug('parsed user config entries: ', userConfigEntries);

  const userConfigDB: ConfigMetaObjectDB = {};

  const newConfigurationQualifier: {
    [key: string]: ConfigurationQualifier;
  } = {};

  Object.entries(userConfigEntries).forEach(([url, data]) => {
    const m = buildConfigMetaContentDBForUser(data);
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

  Object.entries(userConfigDB).forEach(([url, cmo]) => {
    // Set the user configuration value
    newUserConfiguration[url] = cmo.modifications.value.content;
  });

  return {
    userConfig: newUserConfiguration,
    userConfigQualifiers: newConfigurationQualifier,
  };
}

async function importButtonCallback(
  gameFolder: string,
  setConfigStatus: (arg0: string) => void,
  t: TFunction<[string, string], undefined>,
  file: string | undefined,
) {
  // Get the current extension state
  const extensionsState = getStore().get(EXTENSION_STATE_REDUCER_ATOM);

  // ConsoleLogger.debug('state before importbuttoncallback', extensionsState);

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
      overrides: new Map<string, Override[]>(),
    },
  } as ExtensionsState;

  // Parse the config file
  const parsingResult: {
    status: string;
    message: string;
    result: ConfigFile;
  } = await loadConfigFromFile(path, t);

  // ConsoleLogger.debug(`Parsing result: `, parsingResult);

  if (parsingResult.status !== 'OK') {
    setConfigStatus(`${parsingResult.status}: ${parsingResult.message}`);
    return;
  }

  if (parsingResult.result === undefined) {
    setConfigStatus(t('gui-editor:config.status.failed.unknown'));
    return;
  }

  const config = parsingResult.result;

  // TODO: don't allow fancy semver in a user configuration. Only allow it in definition.yml. Use tree logic.
  // Get the load order from the sparse part of the config file

  LOGGER.msg('Attempting full strategy').debug();
  const fullStrategyResult = await fullStrategy(
    newExtensionsState,
    config,
    setConfigStatus,
  );

  let strategyResult = fullStrategyResult;

  if (fullStrategyResult.status === 'error') {
    if (fullStrategyResult.code === 'GENERIC') {
      LOGGER.msg(fullStrategyResult.messages.join('\n')).error();
      return;
    }

    if (fullStrategyResult.code === 'MISSING_DEPENDENCIES') {
      // Continue with sparse mode
      LOGGER.msg('Attempting sparse strategy').debug();
      const sparseStrategyResult = await sparseStrategy(
        newExtensionsState,
        config,
        setConfigStatus,
      );

      if (sparseStrategyResult.status === 'error') {
        // Attempt the full strategy
        LOGGER.msg(sparseStrategyResult.messages.join('\n')).error();

        await showModalOk({
          title: 'Failed to import config',
          message: `Import failed. Reason:\n\n${sparseStrategyResult.messages.join('\n')}`,
        });
        return;
      }
      strategyResult = sparseStrategyResult;
    }
  }

  if (strategyResult.status !== 'ok') {
    await showModalOk({
      title: 'unexpected exception',
      message:
        'occurred when importing config. Error code import-button-callback-1.',
    });
    return;
  }

  newExtensionsState = (strategyResult as Success).newExtensionsState;

  // ConsoleLogger.debug('opened config', parsingResult.result);

  const ucos = constructUserConfigObjects(config);
  const newUserConfiguration = ucos.userConfig;
  const newConfigurationQualifier = ucos.userConfigQualifiers;

  getStore().set(CONFIGURATION_USER_REDUCER_ATOM, {
    type: 'reset',
    value: newUserConfiguration,
  });
  getStore().set(CONFIGURATION_TOUCHED_REDUCER_ATOM, {
    type: 'reset',
    value: {},
  });
  getStore().set(CONFIGURATION_QUALIFIER_REDUCER_ATOM, {
    type: 'reset',
    value: newConfigurationQualifier,
  });

  ConsoleLogger.debug(
    'import-button-callback.tsx: new extension state',
    newExtensionsState,
  );
  // Set the new extension state, which fires an update of the full config
  getStore().set(EXTENSION_STATE_INTERFACE_ATOM, newExtensionsState);
}

export default importButtonCallback;
