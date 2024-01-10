import { Extension } from '../../../config/ucp/common';
import { serializeUCPConfig } from '../../../config/ucp/config-files';
import { ConfigurationQualifier } from '../../../function/configuration/state';

function serializeConfig(
  configuration: { [key: string]: unknown },
  folder: string,
  touched: { [key: string]: boolean },
  sparseExtensions: Extension[],
  allExtensions: Extension[],
  configurationQualifier: { [key: string]: ConfigurationQualifier },
) {
  const sparseConfig = Object.fromEntries(
    Object.entries(configuration).filter(([key]) => touched[key]),
  );

  const fullConfig = configuration;

  return serializeUCPConfig(
    sparseConfig,
    fullConfig,
    sparseExtensions,
    allExtensions,
    configurationQualifier,
  );
}

export default serializeConfig;
