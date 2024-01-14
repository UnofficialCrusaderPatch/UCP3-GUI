import { Extension } from '../../../config/ucp/common';
import { saveUCPConfig } from '../../../config/ucp/config-files';
import { ConfigurationQualifier } from '../../../function/configuration/state';
import { ConsoleLogger } from '../../../util/scripts/logging';

function saveConfig(
  configuration: { [key: string]: unknown },
  userConfiguration: { [key: string]: unknown },
  folder: string,
  sparseExtensions: Extension[],
  allExtensions: Extension[],
  configurationQualifier: { [key: string]: ConfigurationQualifier },
) {
  ConsoleLogger.debug(`Saving config: `, configuration);

  return saveUCPConfig(
    { ...userConfiguration },
    { ...configuration },
    [...sparseExtensions].reverse(),
    [...allExtensions].reverse(),
    folder,
    configurationQualifier,
  );
}

export default saveConfig;
