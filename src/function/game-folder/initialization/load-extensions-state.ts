import { exists } from '@tauri-apps/api/fs';
import importButtonCallback from '../../../components/ucp-tabs/common/importing/import-button-callback';
import { getStore } from '../../../hooks/jotai/base';
import { ExtensionsState } from '../../extensions/extensions-state';
import { setExtensionsStateAndClearConfiguration } from '../../extensions/state/init';
import { FIRST_TIME_USE_ATOM } from '../../gui-settings/settings';
import { LOGGER } from '../logger';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from '../../../components/ucp-tabs/common/buttons/config-serialized-state';
import { saveCurrentConfig } from '../../../components/ucp-tabs/common/save-config';
import { ConsoleLogger } from '../../../util/scripts/logging';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../extensions/state/state';
import { activateFirstTimeUseExtensions } from '../modifications/activate-first-time-use-extensions';
// eslint-disable-next-line @typescript-eslint/no-unused-vars

// eslint-disable-next-line import/prefer-default-export
export async function setupExtensionsStateConfiguration(
  newExtensionsState: ExtensionsState,
  folder: string,
  file: string,
) {
  LOGGER.msg(`Trying to load ${file}`).info();

  // This is here so the import button callback uses the correct state
  // The first time use logic can not set anything so that is why the state is set here
  setExtensionsStateAndClearConfiguration(newExtensionsState);

  if (await exists(file)) {
    getStore().set(FIRST_TIME_USE_ATOM, false);
    try {
      const result = await importButtonCallback(
        folder,
        () => {},
        (message) => message, // TODO: will need a refactoring
        file,
      );

      if (result.status === 'fail') {
        if (result.reason === 'file') {
          throw Error(`${result.reason} ${result.report}`);
        } else {
          throw Error(`${result.reason} ${result.message.report}`);
        }
      }
    } catch (err: unknown) {
      LOGGER.msg(`${err}`).error();
    }
  } else {
    LOGGER.msg(`no ${file} file found`).info();

    if (getStore().get(FIRST_TIME_USE_ATOM)) {
      LOGGER.msg('first time use!').info();

      try {
        const newerExtensionState =
          activateFirstTimeUseExtensions(newExtensionsState).getOrThrow();
        getStore().set(EXTENSION_STATE_REDUCER_ATOM, newerExtensionState);
        getStore().set(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM, true);

        ConsoleLogger.debug(
          await saveCurrentConfig({
            file,
          }),
        );
      } catch (err: unknown) {
        LOGGER.msg(`Not setting first-time-use state because: ${err}`).warn();
      }
    }
  }

  LOGGER.msg(`Finished loading ${file}`).info();
}
