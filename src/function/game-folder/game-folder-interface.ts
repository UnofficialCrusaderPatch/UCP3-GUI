import { atom } from 'jotai';

import { exists } from '@tauri-apps/api/fs';
import i18next from 'i18next';
import { getVersion } from '@tauri-apps/api/app';
import { INIT_DONE, INIT_ERROR, INIT_RUNNING } from './initialization-states';
import { GAME_FOLDER_ATOM } from './game-folder-atom';
import { showModalOk } from '../../components/modals/modal-ok';
import importButtonCallback from '../../components/ucp-tabs/common/import-button-callback';
import { Extension } from '../../config/ucp/common';
import { getStore } from '../../hooks/jotai/base';
import Logger, { ConsoleLogger } from '../../util/scripts/logging';
import {
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_WARNINGS_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_FULL_REDUCER_ATOM,
  UCP_CONFIG_FILE_ATOM,
} from '../configuration/state';
import { ExtensionTree } from '../extensions/dependency-management/dependency-resolution';
import { Discovery } from '../extensions/discovery/discovery';
import { ExtensionsState } from '../extensions/extensions-state';
import { EXTENSION_STATE_REDUCER_ATOM } from '../extensions/state/state';
import {
  UCP_VERSION_ATOM,
  initializeUCPVersion,
} from '../ucp-files/ucp-version';
import { FIRST_TIME_USE_ATOM } from '../gui-settings/settings';
import { addExtensionToExplicityActivatedExtensions } from '../../components/ucp-tabs/extension-manager/extensions-state-manipulation';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from '../../components/ucp-tabs/common/buttons/config-serialized-state';

const LOGGER = new Logger('game-folder-interface.ts');

export async function initializeGameFolder(newFolder: string) {
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
      extensions = await Discovery.discoverExtensions(newFolder);
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
    tree: new ExtensionTree(
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

    // const [t] = useTranslation(['gui-general', 'gui-editor']);
    const { t } = i18next;

    if (await exists(file)) {
      getStore().set(FIRST_TIME_USE_ATOM, false);
      try {
        await importButtonCallback(newFolder, () => {}, t, file);
      } catch (err: any) {
        loggerState.setMsg(err).error();
      }
    } else {
      loggerState.setMsg('no ucp-config.yml file found').info();

      if (getStore().get(FIRST_TIME_USE_ATOM)) {
        loggerState.setMsg('first time use!').info();
        const targetExtensions = newExtensionsState.extensions.filter(
          (ext) => ext.name === 'ucp2-legacy-defaults',
        );
        if (targetExtensions.length > 0) {
          loggerState.setMsg('found ucp2-legacy-defaults').info();
          const targetExtension = targetExtensions
            .sort((a, b) => a.version.localeCompare(b.version))
            .at(0)!;

          const newerExtensionState =
            addExtensionToExplicityActivatedExtensions(
              newExtensionsState,
              targetExtension,
            );

          getStore().set(EXTENSION_STATE_REDUCER_ATOM, newerExtensionState);

          getStore().set(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM, true);
        }
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

// eslint-disable-next-line import/prefer-default-export
export const GAME_FOLDER_INTERFACE_ASYNC_ATOM = atom(
  (get) => get(GAME_FOLDER_ATOM),
  async (get, set, newValue: string) => {
    const oldValue = get(GAME_FOLDER_ATOM);

    if (newValue === oldValue || get(INIT_RUNNING)) {
      return;
    }

    LOGGER.msg('Initializing ucp version information').debug();
    await initializeUCPVersion(newValue);
    LOGGER.msg('Initializing ucp version information finished').debug();

    LOGGER.msg('Initializing game folder').debug();
    await initializeGameFolder(newValue);
    LOGGER.msg('Initializing game folder finished').debug();

    set(GAME_FOLDER_ATOM, newValue);
  },
); // eslint-disable-next-line import/prefer-default-export
