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

// eslint-disable-next-line import/prefer-default-export
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
    try {
      const importResult = await importButtonCallback(
        folder,
        () => {},
        (message) => message, // TODO: will need a refactoring
        file,
      );

      // A failed or cancelled load leaves a partial setup that must not be
      // written over the file by Save before launch.
      getStore().set(
        PROFILE_NOT_LOADED_ATOM,
        importResult.status !== 'success',
      );

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

      endResult = Result.emptyOk();
    } catch (err: any) {
      LOGGER.msg(`${err}`).error();
      getStore().set(PROFILE_NOT_LOADED_ATOM, true);

      endResult = Result.err(`${err?.message ?? err}`);
    }
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
