import { getVersion } from '@tauri-apps/api/app';
import { exists } from '@tauri-apps/api/fs';
import { showModalOk } from '../../../components/modals/modal-ok';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from '../../../components/ucp-tabs/common/buttons/config-serialized-state';
import importButtonCallback from '../../../components/ucp-tabs/common/importing/import-button-callback';
import { saveCurrentConfig } from '../../../components/ucp-tabs/common/save-config';
import { Extension } from '../../../config/ucp/common';
import { getStore } from '../../../hooks/jotai/base';
import { ConsoleLogger } from '../../../util/scripts/logging';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_WARNINGS_REDUCER_ATOM,
  UCP_CONFIG_FILE_ATOM,
} from '../../configuration/state';
import { ExtensionDependencyTree } from '../../extensions/dependency-management/dependency-resolution';
import { discoverExtensions } from '../../extensions/discovery/discovery';
import { ExtensionsState } from '../../extensions/extensions-state';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../extensions/state/state';
import { FIRST_TIME_USE_ATOM } from '../../gui-settings/settings';
import { UCP_VERSION_ATOM } from '../../ucp-files/ucp-version';
import { activateFirstTimeUseExtensions } from '../modifications/activate-first-time-use-extensions';
import { INIT_DONE, INIT_ERROR, INIT_RUNNING } from './initialization-states';
import { LOGGER } from '../logger';

// eslint-disable-next-line import/prefer-default-export
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
