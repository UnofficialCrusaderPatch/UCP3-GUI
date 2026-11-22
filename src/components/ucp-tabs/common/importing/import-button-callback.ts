import { collectConfigEntries } from '../../../../function/extensions/discovery/collect-config-entries';
import {
  ConfigurationQualifier,
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../../function/configuration/state';
import { openFileDialog } from '../../../../tauri/tauri-dialog';
import { getStore } from '../../../../hooks/jotai/base';

import {
  ConfigFile,
  ConfigEntry,
  ConfigFileExtensionEntry,
  Extension,
} from '../../../../config/ucp/common';
import { loadConfigFromFile } from '../../../../config/ucp/config-files/config-files';
import { ConfigMetaObjectDB } from '../../../../config/ucp/config-merge/objects';

import {
  EXTENSION_STATE_INTERFACE_ATOM,
  EXTENSION_STATE_REDUCER_ATOM,
  PREFERRED_EXTENSION_VERSION_ATOM,
} from '../../../../function/extensions/state/state';
import { ConsoleLogger } from '../../../../util/scripts/logging';
import warnClearingOfConfiguration from '../warn-clearing-of-configuration';
import { CONFIGURATION_DISK_STATE_ATOM } from '../../../../function/extensions/state/disk';
import {
  GUI_LOCALIZATION_ATOM,
  MessageType,
} from '../../../../localization/localization';
import { ImportButtonCallbackResult, makeErrorReport } from './result';
import { attemptStrategies } from './import-strategies/attempt-strategies';
import { showModalOk } from '../../../modals/modal-ok';
import { buildConfigMetaContentDBForUser } from '../../../../function/configuration/extension-configuration/build-config-meta-content-db';
import { warnLoadedConfigurationChanges } from './warn-loaded-configuration-changes';
import {
  findProfileFamilyConflicts,
  profileActiveExtensions,
  withoutProfileMembers,
} from '../../../../function/extensions/dependency-management/families';
import { chooseProfileFamilyMembers } from './family-chooser';
import { createExtensionID } from '../../../../function/global/constants/extension-id';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from '../buttons/config-serialized-state';
import { ExtensionsState } from '../../../../function/extensions/extensions-state';
import { saveStateChanges } from '../../../../function/extensions/save-state';
import { confirmSaveStateLoss } from '../save-state-loss-dialog';

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

  // A section may legitimately hold only a load order.
  Object.entries(config['config-sparse'].modules ?? {}).forEach(parseEntry);
  Object.entries(config['config-sparse'].plugins ?? {}).forEach(parseEntry);

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

export type StagedImport =
  | { status: 'ok'; newExtensionsState: ExtensionsState }
  | { status: 'fail'; result: ImportButtonCallbackResult };

/** Resolves a profile against the installed extensions without changing live state. */
export function stageUcpConfigImport(
  config: ConfigFile,
  setConfigStatus: (message: MessageType) => void,
): StagedImport {
  // Get the current extension state
  const extensionsState = getStore().get(EXTENSION_STATE_REDUCER_ATOM);

  ConsoleLogger.debug(
    'import-button-callback.tsx: old extension state',
    extensionsState,
  );

  ConsoleLogger.debug('import-button-callback.tsx: config', config);

  const strategyResultReport = attemptStrategies(
    config,
    extensionsState,
    setConfigStatus,
  );

  const { result } = strategyResultReport;

  if (result === undefined || result.status !== 'ok') {
    const elab = makeErrorReport(strategyResultReport);
    return {
      status: 'fail',
      result: {
        status: 'fail',
        reason: 'strategy',
        report: strategyResultReport,
        elaborateMessage: elab,
        message: `${elab.title}\n${elab.shortDescription}\n${elab.report}`,
      } as ImportButtonCallbackResult,
    };
  }

  return { status: 'ok', newExtensionsState: result.newExtensionsState };
}

export function importUcpConfig(
  config: ConfigFile,
  setConfigStatus: (message: MessageType) => void,
  staged: StagedImport = stageUcpConfigImport(config, setConfigStatus),
): ImportButtonCallbackResult {
  if (staged.status === 'fail') return staged.result;

  const { newExtensionsState } = staged;

  /**
   * Make sure to apply the current loaded configuration exactly as is (version specific)
   * to the configuration tree.
   */
  newExtensionsState.tree.reset();
  const solution = newExtensionsState.tree.extensionDependenciesForExtensions(
    newExtensionsState.activeExtensions,
  );

  if (solution.status !== 'OK') {
    showModalOk({
      title: 'Unknown error',
      message:
        'An uncaught error occurred while importing your config from disk. Error code: invalid tree',
    });
  }

  // Parse everything before the first live write, so a malformed section can't
  // leave a half-imported setup behind.
  const ucos = constructUserConfigObjects(config);
  const newUserConfiguration = ucos.userConfig;
  const newConfigurationQualifier = ucos.userConfigQualifiers;
  const full = config['config-full'];
  // Without saved values there is no baseline to compare game settings against.
  const savedFullConfiguration =
    full && (full.modules !== undefined || full.plugins !== undefined)
      ? constructUserConfigObjects({ ...config, 'config-sparse': full })
          .userConfig
      : undefined;

  /* Remember the active extensions as on disk (ucp-config.yml file) */
  getStore().set(CONFIGURATION_DISK_STATE_ATOM, [
    ...newExtensionsState.activeExtensions,
  ]);

  getStore().set(CONFIGURATION_USER_REDUCER_ATOM, {
    type: 'reset',
    value: newUserConfiguration,
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

  const changedUrls = warnLoadedConfigurationChanges(
    newUserConfiguration,
    getStore().get(CONFIGURATION_USER_REDUCER_ATOM),
    savedFullConfiguration,
    getStore().get(CONFIGURATION_FULL_REDUCER_ATOM),
  );
  getStore().set(CONFIGURATION_TOUCHED_REDUCER_ATOM, {
    type: 'reset',
    value: Object.fromEntries(changedUrls.map((url) => [url, true])),
  });

  return {
    status: 'success',
  } as ImportButtonCallbackResult;
}

export type ImportOptions = {
  /** Ask before an import drops modules that saved games depend on. */
  confirmSaveStateLoss?: boolean;
};

export async function importUcpConfigFile(
  path: string,
  setConfigStatus: (message: MessageType) => void,
  options: ImportOptions = {},
): Promise<ImportButtonCallbackResult> {
  // Parse the config file
  const parsingResult: {
    status: string;
    message: string;
    result: ConfigFile;
  } = await loadConfigFromFile(path);

  // ConsoleLogger.debug(`Parsing result: `, parsingResult);

  if (parsingResult.status !== 'OK') {
    setConfigStatus(
      (localize) =>
        `${parsingResult.status}: ${localize(parsingResult.message)}`,
    );
    return {
      status: 'fail',
      reason: 'file',
      message: `${parsingResult.status}: ${parsingResult.message}`,
    } as ImportButtonCallbackResult;
  }

  if (parsingResult.result === undefined) {
    setConfigStatus('config.status.failed.unknown');
    return {
      status: 'fail',
      reason: 'file',
      message: `undefined result object`,
    } as ImportButtonCallbackResult;
  }

  const config = parsingResult.result;

  // A profile that selects two members of one family is not an error: the player
  // chooses which one to keep, and only then is a filtered copy staged and loaded.
  const current = getStore().get(EXTENSION_STATE_REDUCER_ATOM);
  const conflicts = findProfileFamilyConflicts(
    config,
    current.extensions,
    current.tree,
  );
  let profile = config;
  let dropped: string[] = [];
  let kept: Extension[] = [];
  if (conflicts.length > 0) {
    const chosen = await chooseProfileFamilyMembers(conflicts);
    if (chosen === undefined) {
      const localize = await getStore().get(GUI_LOCALIZATION_ATOM);
      setConfigStatus('config.load.family.cancelled');
      return {
        status: 'fail',
        reason: 'family',
        message: localize('config.load.family.cancelled'),
      } as ImportButtonCallbackResult;
    }
    dropped = chosen;
    kept = [
      ...new Map(
        conflicts
          .flatMap(({ members }) => members)
          .filter(({ name }) => !dropped.includes(name))
          .map((ext) => [ext.name, ext]),
      ).values(),
    ];
    profile = withoutProfileMembers(config, dropped, kept);
  }

  // Staging a sparse profile already records preferred versions; a cancelled
  // import must leave them as they were.
  const preferredVersions = getStore().get(PREFERRED_EXTENSION_VERSION_ATOM);
  const staged = stageUcpConfigImport(profile, setConfigStatus);
  if (staged.status === 'ok') {
    const incoming = staged.newExtensionsState.activeExtensions;
    // Never report success for a choice the resolved setup doesn't honour.
    const missing = kept.filter(
      ({ name }) => !incoming.some((ext) => ext.name === name),
    );
    if (missing.length > 0) {
      getStore().set(PREFERRED_EXTENSION_VERSION_ATOM, preferredVersions);
      const localize = await getStore().get(GUI_LOCALIZATION_ATOM);
      return {
        status: 'fail',
        reason: 'family',
        message: localize({
          key: 'discovery.family.conflict.message',
          args: { details: missing.map(createExtensionID).join('\n') },
        }),
      } as ImportButtonCallbackResult;
    }
    // Importing replaces the whole setup; only a player-initiated import starts
    // from a live setup (startup and reload start empty). A family choice can
    // also leave out modules the saved setup itself used.
    const removed = [
      ...(options.confirmSaveStateLoss
        ? saveStateChanges(current.activeExtensions, incoming).removed
        : []),
      ...(dropped.length > 0
        ? saveStateChanges(
            profileActiveExtensions(config, current.extensions, current.tree),
            incoming,
          ).removed
        : []),
    ];
    if (!(await confirmSaveStateLoss(removed))) {
      getStore().set(PREFERRED_EXTENSION_VERSION_ATOM, preferredVersions);
      return { status: 'aborted' } as ImportButtonCallbackResult;
    }
  }
  const result = importUcpConfig(profile, setConfigStatus, staged);
  // The loaded setup differs from the file until the player saves it.
  if (dropped.length > 0 && result.status === 'success')
    getStore().set(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM, true);
  return result;
}

/**
 * Sets the extensions state and all other atoms to state improted by the config file
 * @param gameFolder The game folder to load the file from
 * @param setConfigStatus The reporting function for progress toasts
 * @param localizeString The localisation function for messages
 * @param file The file name
 * @returns A promise of the succesfulness of the impor
 */
async function importButtonCallback(
  gameFolder: string,
  setConfigStatus: (message: MessageType) => void,
  localizeString: (message: string) => string,
  file: string | undefined,
  options: ImportOptions = {},
): Promise<ImportButtonCallbackResult> {
  // Get which elements have been touched
  const configurationTouched = getStore().get(
    CONFIGURATION_TOUCHED_REDUCER_ATOM,
  );

  // Warn clearing of configuration because of touched configuration values
  // Before importing was initialized.
  const clearingConfirmation =
    await warnClearingOfConfiguration(configurationTouched);
  if (!clearingConfirmation)
    return {
      status: 'aborted',
    } as ImportButtonCallbackResult;

  // ConsoleLogger.debug('state before importbuttoncallback', extensionsState);
  let path = file;

  // If source file hasn't been specified, open up a dialog to specify it.
  if (file === undefined || file.length === 0) {
    const pathResult = await openFileDialog(gameFolder, [
      {
        name: localizeString('file.config'),
        extensions: ['yml', 'yaml'],
      },
      { name: localizeString('file.all'), extensions: ['*'] },
    ]);
    if (pathResult.isEmpty()) {
      setConfigStatus('config.status.no.file');
      return {
        status: 'aborted',
      } as ImportButtonCallbackResult;
    }

    path = pathResult.get();
  }

  // The user cancelled the action
  if (path === undefined)
    return {
      status: 'aborted',
    } as ImportButtonCallbackResult;

  return importUcpConfigFile(path, setConfigStatus, options);
}

export default importButtonCallback;
