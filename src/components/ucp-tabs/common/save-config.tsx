import { Extension } from '../../../config/ucp/common';
import { saveUCPConfig } from '../../../config/ucp/config-files/config-files';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
  ConfigurationQualifier,
  UCP_CONFIG_FILE_ATOM,
} from '../../../function/configuration/state';
import { CONFIGURATION_DISK_STATE_ATOM as CONFIGURATION_DISK_STATE_ACTIVE_EXTENSIONS } from '../../../function/extensions/state/disk';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../../function/extensions/state/state';
import { getStore } from '../../../hooks/jotai/base';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from './buttons/config-serialized-state';

/**
 * Note: reverses both lists of extensions to match what the export order expects.
 *
 *
 * @param configuration The full configuration
 * @param userConfiguration The user configuration
 * @param filePath The file path to save to
 * @param explicitlyActivatedExtensions The explicitly activated extensions
 * @param activeExtensions All active extensions
 * @param configurationQualifier Dictionary of qualifiers
 * @returns Message
 */
function saveConfig(
  configuration: { [key: string]: unknown },
  userConfiguration: { [key: string]: unknown },
  filePath: string,
  explicitlyActivatedExtensions: Extension[],
  activeExtensions: Extension[],
  configurationQualifier: { [key: string]: ConfigurationQualifier },
) {
  // ConsoleLogger.debug(`Saving config: `, configuration);

  return saveUCPConfig(
    { ...userConfiguration },
    { ...configuration },
    [...explicitlyActivatedExtensions].reverse(),
    [...activeExtensions].reverse(),
    filePath,
    configurationQualifier,
  ).then((value) => {
    getStore().set(CONFIGURATION_TOUCHED_REDUCER_ATOM, {
      type: 'reset',
      value: {},
    });

    getStore().set(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM, false);

    /* Remember the active extensions that are now on disk */
    getStore().set(CONFIGURATION_DISK_STATE_ACTIVE_EXTENSIONS, [
      ...activeExtensions,
    ]);

    return value;
  });
}

export function saveCurrentConfig(helpingInfo?: { file?: string }) {
  let file = getStore().get(UCP_CONFIG_FILE_ATOM);
  if (file === undefined || file.length === 0) {
    if (helpingInfo !== undefined) {
      if (helpingInfo.file !== undefined) {
        file = helpingInfo.file;
      } else {
        throw Error(`no folder specified`);
      }
    } else {
      throw Error(`no folder specified`);
    }
  }
  return saveConfig(
    { ...getStore().get(CONFIGURATION_FULL_REDUCER_ATOM) },
    { ...getStore().get(CONFIGURATION_USER_REDUCER_ATOM) },
    file,
    [
      ...getStore().get(EXTENSION_STATE_REDUCER_ATOM)
        .explicitlyActivatedExtensions,
    ],
    [...getStore().get(EXTENSION_STATE_REDUCER_ATOM).activeExtensions],
    getStore().get(CONFIGURATION_QUALIFIER_REDUCER_ATOM),
  );
}

export default saveConfig;
