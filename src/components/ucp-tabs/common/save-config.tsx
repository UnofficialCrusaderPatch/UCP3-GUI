import { Extension } from '../../../config/ucp/common';
import { saveUCPConfig } from '../../../config/ucp/config-files/config-files';
import {
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  ConfigurationQualifier,
} from '../../../function/configuration/state';
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

export default saveConfig;
