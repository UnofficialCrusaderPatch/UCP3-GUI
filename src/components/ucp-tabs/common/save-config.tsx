import { Extension } from '../../../config/ucp/common';
import { saveUCPConfig } from '../../../config/ucp/config-files/config-files';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
  ConfigurationQualifier,
} from '../../../function/configuration/state';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../../function/extensions/state/state';
import { GAME_FOLDER_ATOM } from '../../../function/game-folder/game-folder-atom';
import { getStore } from '../../../hooks/jotai/base';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from './buttons/config-serialized-state';

function saveConfig(
  configuration: { [key: string]: unknown },
  userConfiguration: { [key: string]: unknown },
  folder: string,
  sparseExtensions: Extension[],
  allExtensions: Extension[],
  configurationQualifier: { [key: string]: ConfigurationQualifier },
) {
  // ConsoleLogger.debug(`Saving config: `, configuration);

  return saveUCPConfig(
    { ...userConfiguration },
    { ...configuration },
    [...sparseExtensions].reverse(),
    [...allExtensions].reverse(),
    folder,
    configurationQualifier,
  ).then((value) => {
    getStore().set(CONFIGURATION_TOUCHED_REDUCER_ATOM, {
      type: 'reset',
      value: {},
    });

    getStore().set(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM, false);

    return value;
  });
}

export function saveCurrentConfig() {
  return saveConfig(
    { ...getStore().get(CONFIGURATION_FULL_REDUCER_ATOM) },
    { ...getStore().get(CONFIGURATION_USER_REDUCER_ATOM) },
    getStore().get(GAME_FOLDER_ATOM),
    [
      ...getStore().get(EXTENSION_STATE_REDUCER_ATOM)
        .explicitlyActivatedExtensions,
    ],
    [...getStore().get(EXTENSION_STATE_REDUCER_ATOM).activeExtensions],
    getStore().get(CONFIGURATION_QUALIFIER_REDUCER_ATOM),
  );
}

export default saveConfig;
