import { exists } from '@tauri-apps/api/fs';
import { showModalOk } from 'components/modals/modal-ok';
import importButtonCallback from 'components/ucp-tabs/common/ImportButtonCallback';
import { Extension } from 'config/ucp/common';
import { getExtensions } from 'config/ucp/extension-util';
import { ExtensionTree } from 'function/extensions/dependency-management/dependency-resolution';
import {
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_WARNINGS_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_REDUCER_ATOM,
  UCP_CONFIG_FILE_ATOM,
} from 'function/configuration/state';
import { EXTENSION_STATE_REDUCER_ATOM } from 'function/extensions/state/state';
import { getStore } from 'hooks/jotai/base';
import i18next from 'i18next';
import Logger, { ConsoleLogger } from 'util/scripts/logging';
import { atom } from 'jotai';

export const LOGGER = new Logger('game-folder/initialization.ts');

export const INIT_DONE = atom(false);
export const INIT_RUNNING = atom(false);

export async function initializeGameFolder(newFolder: string) {
  const loggerState = LOGGER.empty();

  getStore().set(INIT_RUNNING, true);
  getStore().set(INIT_DONE, false);

  const extensionsState = getStore().get(EXTENSION_STATE_REDUCER_ATOM);

  let extensions: Extension[] = [];
  let defaults = {};
  let file = '';
  if (newFolder.length > 0) {
    loggerState.setMsg(`Current folder: ${newFolder}`).info();

    // TODO: currently only set on initial render and folder selection
    // TODO: resolve this type badness
    try {
      extensions = await getExtensions(newFolder);
    } catch (e) {
      LOGGER.obj(e).error();
      await showModalOk({
        message: (e as object).toString(),
        title: 'Error in extensions',
      });
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
  }

  getStore().set(CONFIGURATION_REDUCER_ATOM, {
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
    tree: new ExtensionTree([...extensions]),
    activeExtensions: [],
    explicitlyActivatedExtensions: [],
    installedExtensions: [...extensions],
    extensions,
  };
  getStore().set(EXTENSION_STATE_REDUCER_ATOM, newExtensionsState);

  getStore().set(UCP_CONFIG_FILE_ATOM, file);

  loggerState.setMsg('Finished extension discovery').info();
  ConsoleLogger.debug(`Extensions state: `, newExtensionsState);

  loggerState.setMsg('Trying to loading ucp-config.yml').info();

  // const [t] = useTranslation(['gui-general', 'gui-editor']);
  const { t } = i18next;

  if (await exists(file)) {
    await importButtonCallback(newFolder, () => {}, t, file);
  } else {
    loggerState.setMsg('no ucp-config.yml file found').info();
  }

  loggerState.setMsg('Finished loading ucp-config.yml').info();

  getStore().set(INIT_DONE, true);
  getStore().set(INIT_RUNNING, false);
} // normal atoms