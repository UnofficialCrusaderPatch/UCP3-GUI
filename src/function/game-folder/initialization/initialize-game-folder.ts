import { getVersion } from '@tauri-apps/api/app';
import { exists } from '@tauri-apps/api/fs';
import { showModalOk } from '../../../components/modals/modal-ok';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from '../../../components/ucp-tabs/common/buttons/config-serialized-state';
import importButtonCallback from '../../../components/ucp-tabs/common/importing/import-button-callback';
import { saveCurrentConfig } from '../../../components/ucp-tabs/common/save-config';
import { Extension } from '../../../config/ucp/common';
import { getStore } from '../../../hooks/jotai/base';
import { ConsoleLogger } from '../../../util/scripts/logging';
import { UCP_CONFIG_FILE_ATOM } from '../../configuration/state';
import { discoverExtensions } from '../../extensions/discovery/discovery';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../extensions/state/state';
import { FIRST_TIME_USE_ATOM } from '../../gui-settings/settings';
import { UCP_VERSION_ATOM } from '../../ucp-files/ucp-version';
import { activateFirstTimeUseExtensions } from '../modifications/activate-first-time-use-extensions';
import { INIT_DONE, INIT_ERROR, INIT_RUNNING } from './initialization-states';
import { LOGGER } from '../logger';
import { clearConfiguration } from '../../configuration/clearConfiguration';
import { UCP_CONFIG_YML } from '../../global/constants/file-constants';
import { createBasicExtensionsState } from '../../extensions/state/init';

/**
 * Initialize the game folder
 *
 * @param folder The (new) game folder
 * @param mode Release or Developer
 * @returns void
 */
// eslint-disable-next-line import/prefer-default-export
export async function initializeGameFolder(
  folder: string,
  mode?: 'Release' | 'Developer',
) {
  const loggerState = LOGGER.empty();

  if (folder.length === 0) {
    loggerState.setMsg('No folder active.').info();
    return;
  }

  getStore().set(INIT_RUNNING, true);
  getStore().set(INIT_DONE, false);
  getStore().set(INIT_ERROR, false);

  const extensionsState = getStore().get(EXTENSION_STATE_REDUCER_ATOM);

  let extensions: Extension[] = [];
  let file = '';

  loggerState.setMsg(`Current folder: ${folder}`).info();

  try {
    extensions = await discoverExtensions(folder, mode);
  } catch (e) {
    LOGGER.obj(e).error();
    await showModalOk({
      message: (e as object).toString(),
      title: 'Error in extension initialization',
    });

    getStore().set(INIT_ERROR, true);
  }

  ConsoleLogger.debug('Discovered extensions: ', extensions);
  ConsoleLogger.debug('pre extensionsState: ', extensionsState);

  file = `${folder}/${UCP_CONFIG_YML}`;

  const frontendVersion = await getVersion();
  const frameworkVersion = getStore().get(UCP_VERSION_ATOM).version
    .isValidForSemanticVersioning
    ? getStore().get(UCP_VERSION_ATOM).version.getMajorMinorPatchAsString()
    : undefined;

  const newExtensionsState = createBasicExtensionsState(
    extensions,
    frontendVersion,
    frameworkVersion,
  );

  loggerState.setMsg('Finished extension discovery').info();
  ConsoleLogger.debug(`Extensions state: `, newExtensionsState);

  const is = newExtensionsState.tree.tryResolveAllDependencies();
  if (is.status !== 'ok') {
    ConsoleLogger.warn(
      `Not all dependencies for all extensions could be resolved:\n${is.messages.join('\n')}`,
    );
  }

  loggerState.setMsg('Setting new extensions state').info();
  getStore().set(EXTENSION_STATE_REDUCER_ATOM, newExtensionsState);

  // This clear needs to be after the new extension state is set
  // Otherwise the GUI tries to use default values that have been wiped
  clearConfiguration();
  if (getStore().get(INIT_ERROR) === false) {
    loggerState.setMsg(`Trying to load ${UCP_CONFIG_YML}`).info();

    if (await exists(file)) {
      getStore().set(FIRST_TIME_USE_ATOM, false);
      try {
        await importButtonCallback(
          folder,
          () => {},
          (message) => message, // TODO: will need a refactoring
          file,
        );
      } catch (err: unknown) {
        loggerState.setMsg(String(err)).error();
      }
    } else {
      loggerState.setMsg(`no ${UCP_CONFIG_YML} file found`).info();

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

    loggerState.setMsg(`Finished loading ${UCP_CONFIG_YML}`).info();
  } else {
    loggerState
      .setMsg(`Not loading ${UCP_CONFIG_YML} as there were errors during init`)
      .warn();
  }

  getStore().set(INIT_DONE, true);
  getStore().set(INIT_RUNNING, false);

  getStore().set(UCP_CONFIG_FILE_ATOM, file);

  loggerState.msg('finished').info();
} // normal atoms
