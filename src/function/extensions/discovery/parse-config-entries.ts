import {
  ConfigEntry,
  ConfigFile,
  ConfigFileExtensionEntry,
} from '../../../config/ucp/common';
import Logger from '../../../util/scripts/logging';
import { collectConfigEntries } from './collect-config-entries';

const LOGGER = new Logger('disovery/config.ts');

type WarningState = {
  status: 'warning';
  warnings: string[];
  configEntries: { [key: string]: ConfigEntry };
};

type OkState = {
  status: 'ok';
  configEntries: { [key: string]: ConfigEntry };
};

export type ParseConfigEntriesState = WarningState | OkState;

export const parseConfigEntries = (config: ConfigFile) => {
  let configEntries = {};
  const warnings: string[] = [];

  const parseEntry = ([extensionName, data]: [
    string,
    {
      config: ConfigFileExtensionEntry;
    },
  ]) => {
    const result = collectConfigEntries(
      data.config as {
        [key: string]: unknown;
        contents: unknown;
      },
      extensionName,
    );

    configEntries = { ...configEntries, ...result };
  };

  let configSparse = config['config-sparse'];

  if (
    configSparse === undefined ||
    configSparse.modules === undefined ||
    configSparse.plugins === undefined ||
    configSparse === null ||
    configSparse.modules === null ||
    configSparse.plugins === null
  ) {
    const msg = `config.yml of extension does not adhere to the configuration spec.`;
    warnings.push(msg);
    LOGGER.msg(msg).warn();

    const cs = config['config-sparse'] || {
      modules: {},
      plugins: {},
    };

    cs.modules = cs.modules || {};
    cs.plugins = cs.plugins || {};

    configSparse = cs;
  }

  Object.entries(configSparse.modules).forEach(parseEntry);
  Object.entries(configSparse.plugins).forEach(parseEntry);

  if (warnings.length === 0) {
    return {
      status: 'ok',
      configEntries,
    } as ParseConfigEntriesState;
  }

  return {
    status: 'warning',
    warnings,
    configEntries,
  } as ParseConfigEntriesState;
};
