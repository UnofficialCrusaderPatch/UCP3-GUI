import { exists } from '@tauri-apps/api/fs';
import importButtonCallback from '../../../components/ucp-tabs/common/importing/import-button-callback';
import { getStore } from '../../../hooks/jotai/base';
import { ExtensionsState } from '../../extensions/extensions-state';
import { clearConfigurationAndSetNewExtensionsState } from '../../extensions/state/init';
import { UCP_CONFIG_YML } from '../../global/constants/file-constants';
import { FIRST_TIME_USE_ATOM } from '../../gui-settings/settings';
import { LOGGER } from '../logger';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { activateFirstTimeUseExtensions } from '../modifications/activate-first-time-use-extensions';

// eslint-disable-next-line import/prefer-default-export
export async function loadExtensionsState(
  newExtensionsState: ExtensionsState,
  folder: string,
  file: string,
) {
  LOGGER.msg(`Trying to load ${UCP_CONFIG_YML}`).info();

  clearConfigurationAndSetNewExtensionsState(newExtensionsState);

  const newerExtensionState = newExtensionsState;

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
      LOGGER.msg(String(err)).error();
    }
  } else {
    LOGGER.msg(`no ${UCP_CONFIG_YML} file found`).info();

    if (getStore().get(FIRST_TIME_USE_ATOM)) {
      LOGGER.msg('first time use!').info();

      // newerExtensionState = activateFirstTimeUseExtensions(newExtensionsState);
      // getStore().set(EXTENSION_STATE_REDUCER_ATOM, newerExtensionState);

      // getStore().set(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM, true);

      // ConsoleLogger.debug(
      //   await saveCurrentConfig({
      //     file,
      //   }),
      // );
    }

    clearConfigurationAndSetNewExtensionsState(newerExtensionState);
  }

  LOGGER.msg(`Finished loading ${UCP_CONFIG_YML}`).info();
}
