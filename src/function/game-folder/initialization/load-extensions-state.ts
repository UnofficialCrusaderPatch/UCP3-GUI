import { exists } from '@tauri-apps/api/fs';
import importButtonCallback from '../../../components/ucp-tabs/common/importing/import-button-callback';
import { getStore } from '../../../hooks/jotai/base';
import { ExtensionsState } from '../../extensions/extensions-state';
import { setExtensionsStateAndClearConfiguration } from '../../extensions/state/init';
import { FIRST_TIME_USE_ATOM } from '../../gui-settings/settings';
import { LOGGER } from '../logger';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from '../../../components/ucp-tabs/common/buttons/config-serialized-state';
import {
  PROFILE_NOT_LOADED_ATOM,
  saveCurrentConfig,
} from '../../../components/ucp-tabs/common/save-config';
import { ConsoleLogger } from '../../../util/scripts/logging';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../extensions/state/state';
import { activateFirstTimeUseExtensions } from '../modifications/activate-first-time-use-extensions';
import Result from '../../../util/structs/result';
import { showModalOk } from '../../../components/modals/modal-ok';
import { loadConfigFromFile } from '../../../config/ucp/config-files/config-files';
import { findProfileFamilyConflicts } from '../../extensions/dependency-management/families';
import { INIT_DONE } from './initialization-states';

export function showLoadFailure(result: Result<void, string>) {
  if (result.isOk()) return;
  showModalOk({
    title: 'config.load.fail.title',
    message: {
      key: 'config.load.fail.message',
      args: { err: result.err().getOrElse('unknown error') },
    },
  });
}

async function loadProfile(
  folder: string,
  file: string,
): Promise<Result<void, string>> {
  try {
    const importResult = await importButtonCallback(
      folder,
      () => {},
      (message) => message, // TODO: will need a refactoring
      file,
    );

    // A failed or cancelled load leaves a partial setup that must not be
    // written over the file by Save before launch.
    getStore().set(PROFILE_NOT_LOADED_ATOM, importResult.status !== 'success');

    if (importResult.status === 'fail') {
      if (importResult.reason === 'file') {
        throw Error(`${importResult.reason} ${importResult.message}`);
      } else if (importResult.reason === 'strategy') {
        throw Error(`${importResult.reason} ${importResult.message}`);
      } else if (importResult.reason === 'family') {
        throw Error(importResult.message);
      } else {
        throw Error(`Unknown error`);
      }
    }

    return Result.emptyOk();
  } catch (err: any) {
    LOGGER.msg(`${err}`).error();
    getStore().set(PROFILE_NOT_LOADED_ATOM, true);

    return Result.err(`${err?.message ?? err}`);
  }
}

async function needsFamilyChoice(file: string, state: ExtensionsState) {
  const { status, result } = await loadConfigFromFile(file);
  return (
    status !== 'FAIL' &&
    findProfileFamilyConflicts(result, state.extensions, state.tree).length > 0
  );
}

export async function setupExtensionsStateConfiguration(
  newExtensionsState: ExtensionsState,
  folder: string,
  file: string,
): Promise<Result<void, string>> {
  LOGGER.msg(`Trying to load ${file}`).info();

  let endResult: Result<void, string> = Result.err('Not set');

  // This is here so the import button callback uses the correct state
  // The first time use logic can not set anything so that is why the state is set here
  setExtensionsStateAndClearConfiguration(newExtensionsState);

  getStore().set(PROFILE_NOT_LOADED_ATOM, false);
  if (await exists(file)) {
    getStore().set(FIRST_TIME_USE_ATOM, false);
    if (await needsFamilyChoice(file, newExtensionsState)) {
      // The launcher renders only after initialization, so the family choice
      // is asked then. Nothing is loaded until the player chooses.
      getStore().set(PROFILE_NOT_LOADED_ATOM, true);
      const unsubscribe = getStore().sub(INIT_DONE, () => {
        if (!getStore().get(INIT_DONE)) return undefined;
        unsubscribe();
        return loadProfile(folder, file).then(showLoadFailure);
      });
      return Result.emptyOk();
    }
    endResult = await loadProfile(folder, file);
  } else {
    LOGGER.msg(`no ${file} file found`).info();

    if (getStore().get(FIRST_TIME_USE_ATOM)) {
      LOGGER.msg('first time use!').info();

      if (newExtensionsState.extensions.length > 0) {
        LOGGER.msg('first time use: framework active').info();
        try {
          const ar = activateFirstTimeUseExtensions(newExtensionsState);

          if (ar.isOk()) {
            const newerExtensionState = ar.getOrThrow();
            getStore().set(EXTENSION_STATE_REDUCER_ATOM, newerExtensionState);
            getStore().set(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM, true);

            ConsoleLogger.debug(
              await saveCurrentConfig({
                file,
              }),
            );
          } else {
            LOGGER.msg(
              `There was an error trying to set first time use extensions: ${ar.err()}`,
            ).error();
          }

          endResult = Result.emptyOk();
        } catch (err: unknown) {
          LOGGER.msg(`Not setting first-time-use state because: ${err}`).warn();

          endResult = Result.err(`${err}`);
        }
      } else {
        LOGGER.msg('first time use: framework not active').info();
        endResult = Result.emptyOk();
      }
    } else {
      endResult = Result.emptyOk();
    }
  }

  LOGGER.msg(`Finished loading ${file}`).info();

  return endResult;
}
