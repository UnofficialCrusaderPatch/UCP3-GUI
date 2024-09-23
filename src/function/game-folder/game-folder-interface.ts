/* eslint-disable no-new-wrappers */

import { exists } from '@tauri-apps/api/fs';
import { getVersion } from '@tauri-apps/api/app';
import { unwrap } from 'jotai/utils';
import { INIT_DONE, INIT_ERROR, INIT_RUNNING } from './initialization-states';
import { showModalOk } from '../../components/modals/modal-ok';
import importButtonCallback from '../../components/ucp-tabs/common/importing/import-button-callback';
import { Extension } from '../../config/ucp/common';
import { atomWithRefresh, getStore } from '../../hooks/jotai/base';
import Logger, { ConsoleLogger } from '../../util/scripts/logging';
import {
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_WARNINGS_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_FULL_REDUCER_ATOM,
  UCP_CONFIG_FILE_ATOM,
} from '../configuration/state';
import { ExtensionDependencyTree } from '../extensions/dependency-management/dependency-resolution';
import { ExtensionsState } from '../extensions/extensions-state';
import { EXTENSION_STATE_REDUCER_ATOM } from '../extensions/state/state';
import {
  UCP_VERSION_ATOM,
  initializeUCPVersion,
} from '../ucp-files/ucp-version';
import { FIRST_TIME_USE_ATOM } from '../gui-settings/settings';
import { addExtensionToExplicityActivatedExtensions } from '../../components/ucp-tabs/extension-manager/extensions-state-manipulation';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from '../../components/ucp-tabs/common/buttons/config-serialized-state';
import { discoverExtensions } from '../extensions/discovery/discovery';
import { buildExtensionConfigurationDB } from '../../components/ucp-tabs/extension-manager/extension-configuration';
import { saveCurrentConfig } from '../../components/ucp-tabs/common/save-config';
import { MOST_RECENT_FOLDER_ATOM } from '../gui-settings/gui-file-config';

const LOGGER = new Logger('game-folder-interface.ts');

export const GAME_FOLDER_EMPTY = new String('');

const activateFirstTimeUseExtensions = (extensionsState: ExtensionsState) => {
  const extensionNames = ['ucp2-legacy-defaults', 'graphicsApiReplacer'];

  const extensions: Extension[] = [];
  extensionNames.forEach((n) => {
    const options = extensionsState.extensions.filter((ext) => ext.name === n);
    if (options.length > 0) {
      extensions.push(
        options.sort((a, b) => a.version.localeCompare(b.version)).at(0)!,
      );
    }
  });

  let newExtensionsState = extensionsState;

  extensions.forEach((ext) => {
    newExtensionsState = addExtensionToExplicityActivatedExtensions(
      newExtensionsState,
      ext,
    );
  });

  return buildExtensionConfigurationDB(newExtensionsState);
};

export async function initializeGameFolder(
  newFolder: string,
  mode?: 'Release' | 'Developer',
) {
  const loggerState = LOGGER.empty();

  getStore().set(INIT_RUNNING, true);
  getStore().set(INIT_DONE, false);
  getStore().set(INIT_ERROR, false);

  const extensionsState = getStore().get(EXTENSION_STATE_REDUCER_ATOM);

  let extensions: Extension[] = [];
  let defaults = {};
  let file = '';
  if (newFolder.length > 0) {
    loggerState.setMsg(`Current folder: ${newFolder}`).info();

    // TODO: currently only set on initial render and folder selection
    // TODO: resolve this type badness
    try {
      extensions = await discoverExtensions(newFolder, mode);
    } catch (e) {
      LOGGER.obj(e).error();
      await showModalOk({
        message: (e as object).toString(),
        title: 'Error in extension initialization',
      });

      getStore().set(INIT_ERROR, true);
    }

    ConsoleLogger.debug('Discovered extensions: ', extensions);
    ConsoleLogger.debug('pre extensionState: ', extensionsState);

    // TODO: this should not be done now, it only makes sense when options are actually presented on screen, e.g., when an extension is made active
    // const optionEntries = extensionsToOptionEntries(extensions);
    // defaults = getConfigDefaults(optionEntries);
    defaults = {};
    file = `${newFolder}/ucp-config.yml`; // better be moved to const file?
  } else {
    loggerState.setMsg('No folder active.').info();

    getStore().set(INIT_DONE, true);
    getStore().set(INIT_RUNNING, false);
    getStore().set(INIT_ERROR, false);

    return;
  }

  getStore().set(CONFIGURATION_FULL_REDUCER_ATOM, {
    type: 'reset',
    value: defaults,
  });
  getStore().set(CONFIGURATION_DEFAULTS_REDUCER_ATOM, {
    type: 'reset',
    value: defaults,
  });
  // currently simply reset:
  getStore().set(CONFIGURATION_TOUCHED_REDUCER_ATOM, {
    type: 'reset',
    value: defaults,
  });
  getStore().set(CONFIGURATION_WARNINGS_REDUCER_ATOM, {
    type: 'reset',
    value: defaults,
  });

  const newExtensionsState = {
    ...extensionsState,
    tree: new ExtensionDependencyTree(
      [...extensions],
      await getVersion(),
      getStore().get(UCP_VERSION_ATOM).version.isValidForSemanticVersioning
        ? getStore().get(UCP_VERSION_ATOM).version.getMajorMinorPatchAsString()
        : undefined,
    ),
    activeExtensions: [],
    explicitlyActivatedExtensions: [],
    installedExtensions: [...extensions],
    extensions,
  } as ExtensionsState;
  loggerState.setMsg('Finished extension discovery').info();
  ConsoleLogger.debug(`Extensions state: `, newExtensionsState);

  const is = newExtensionsState.tree.tryResolveAllDependencies();
  if (is.status !== 'ok') {
    ConsoleLogger.warn(
      `Not all dependencies for all extensions could be resolved:\n${is.messages.join('\n')}`,
    );
  }

  getStore().set(EXTENSION_STATE_REDUCER_ATOM, newExtensionsState);

  getStore().set(UCP_CONFIG_FILE_ATOM, file);

  if (getStore().get(INIT_ERROR) === false) {
    loggerState.setMsg('Trying to load ucp-config.yml').info();

    if (await exists(file)) {
      getStore().set(FIRST_TIME_USE_ATOM, false);
      try {
        await importButtonCallback(
          newFolder,
          () => {},
          (message) => message, // TODO: will need a refactoring
          file,
        );
      } catch (err: unknown) {
        loggerState.setMsg(String(err)).error();
      }
    } else {
      loggerState.setMsg('no ucp-config.yml file found').info();

      if (getStore().get(FIRST_TIME_USE_ATOM)) {
        loggerState.setMsg('first time use!').info();

        const newerExtensionState =
          activateFirstTimeUseExtensions(newExtensionsState);
        getStore().set(EXTENSION_STATE_REDUCER_ATOM, newerExtensionState);

        getStore().set(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM, true);

        ConsoleLogger.debug(
          await saveCurrentConfig({
            file,
          }),
        );
      }
    }

    loggerState.setMsg('Finished loading ucp-config.yml').info();
  } else {
    loggerState
      .setMsg('Not loading ucp-config.yml as there were errors during init')
      .info();
  }

  getStore().set(INIT_DONE, true);
  getStore().set(INIT_RUNNING, false);
} // normal atoms

/**
 * Return String wrapper objects to always generate updates.
 * Be aware of this in case of comparisons!
 */
export const ASYNC_GAME_FOLDER_ATOM = atomWithRefresh(async (get) => {
  const newFolder = await get(MOST_RECENT_FOLDER_ATOM);

  if (!newFolder) {
    return GAME_FOLDER_EMPTY;
  }

  LOGGER.msg('Initializing ucp version information').debug();
  await initializeUCPVersion(newFolder);
  LOGGER.msg('Initializing ucp version information finished').debug();

  LOGGER.msg('Initializing game folder').debug();
  await initializeGameFolder(
    newFolder,
    getStore().get(UCP_VERSION_ATOM).version.getBuildRepresentation() ===
      'Developer'
      ? 'Developer'
      : 'Release',
  );
  LOGGER.msg('Initializing game folder finished').debug();
  return new String(newFolder);
});

export const GAME_FOLDER_ATOM = unwrap(
  ASYNC_GAME_FOLDER_ATOM,
  (prev) => prev ?? GAME_FOLDER_EMPTY,
);

export function reloadCurrentGameFolder() {
  getStore().set(ASYNC_GAME_FOLDER_ATOM);
}
