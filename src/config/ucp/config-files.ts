/* eslint-disable no-param-reassign */
import { TFunction } from 'i18next';
import { stringify as yamlStringify } from 'yaml';
import { writeTextFile, loadYaml } from '../../tauri/tauri-files';
import Result from '../../util/structs/result';
import { ConfigurationQualifier } from '../../function/global/types';
import Logger from '../../util/scripts/logging';
import { ConfigFile, Extension } from './common';

const LOGGER = new Logger('config-files.ts');

export async function loadConfigFromFile(filePath: string, t: TFunction) {
  const configRes: Result<ConfigFile, unknown> = await loadYaml(filePath); // will only be one

  if (configRes.isErr()) {
    return {
      status: 'FAIL',
      message: `${configRes.err().get()}`,
      result: {} as ConfigFile,
    };
  }

  const config = configRes.getOrThrow();
  // TODO: improve
  if (config['config-sparse'] === undefined) {
    return {
      status: 'FAIL',
      message: t('gui-editor:config.not.valid'),
      result: {} as ConfigFile,
    };
  }

  // const finalConfig: { [key: string]: unknown } = {};

  // Object.entries(config['config-sparse'].modules || {}).forEach(
  //   ([key, value]) => {
  //     finalConfig[key] = value;
  //   }
  // );

  // Object.entries(config['config-sparse'].plugins || {}).forEach(
  //   ([key, value]) => {
  //     finalConfig[key] = value;
  //   }
  // );

  return {
    status: 'OK',
    message: '',
    result: config,
  };
}

type Contents = {
  value: unknown;
} & {
  'required-value': unknown;
} & {
  'suggested-value': unknown;
};

type SubObjectOrContents = {
  [key: string]:
    | SubObjectOrContents
    | {
        contents: Contents;
      };
};

type ConfigExtensionPart = {
  config: SubObjectOrContents;
};

type ConfigPart = {
  'load-order': string[];
  modules: {
    [key: string]: ConfigExtensionPart;
  };
  plugins: {
    [key: string]: ConfigExtensionPart;
  };
};

type PluginConfigPart = {
  modules: {
    [key: string]: ConfigExtensionPart;
  };
  plugins: {
    [key: string]: ConfigExtensionPart;
  };
};

export type UCP3SerializedPluginConfig = {
  'specification-version': string;
  'config-sparse': PluginConfigPart;
};

export type UCP3SerializedUserConfig = {
  active: boolean;
  'specification-version': string;
  'config-sparse': ConfigPart;
  'config-full': ConfigPart;
};

function saveUCPConfigPart(
  finalConfig: UCP3SerializedUserConfig,
  subConfig: 'config-full' | 'config-sparse',
  config: { [key: string]: unknown },
  extensions: Extension[],
  allExtensions: Extension[],
  configurationQualifier: { [key: string]: ConfigurationQualifier },
) {
  LOGGER.msg('Saving ucp config part').info();
  LOGGER.obj(finalConfig[subConfig]).debug();

  finalConfig[subConfig]['load-order'] = extensions.map(
    (e: Extension) => `${e.name} == ${e.version}`,
  );

  Object.entries(config)
    .filter(([, value]) => value !== undefined)
    .forEach(([key, value]) => {
      const parts = key.split('.');
      const extName = parts[0];

      const ext = allExtensions.filter((ex) => ex.name === extName)[0];

      if (ext === undefined || ext === null) {
        LOGGER.msg(`No extension found with name: ${extName}`).error();
      }

      const type = ext.type === 'module' ? 'modules' : 'plugins';

      if (finalConfig[subConfig][type][extName] === undefined) {
        finalConfig[subConfig][type][extName] = {
          config: {},
        };
      }

      const configParts = parts.slice(1);
      const partsdrop1 = configParts.slice(0, -1);
      const finalpart = configParts.slice(-1)[0];
      let fcp = finalConfig[subConfig][type][extName].config;
      partsdrop1.forEach((part: string) => {
        if (fcp[part] === undefined) {
          fcp[part] = {};
        }
        fcp = fcp[part] as SubObjectOrContents;
      });
      if (fcp[finalpart] === undefined) {
        fcp[finalpart] = { contents: {} };
      }
      const c = fcp[finalpart].contents as Contents;

      if (configurationQualifier[key] !== undefined) {
        if (configurationQualifier[key] === 'required') {
          c['required-value'] = value;
        } else if (configurationQualifier[key] === 'suggested') {
          c['suggested-value'] = value;
        } else {
          c['required-value'] = value;
        }
      } else {
        c.value = value;
      }
    });

  extensions.forEach((e: Extension) => {
    if (e.type === 'module') {
      if (finalConfig[subConfig].modules[e.name] === undefined) {
        finalConfig[subConfig].modules[e.name] = { config: {} };
      }
    }
    if (e.type === 'plugin') {
      if (finalConfig[subConfig].plugins[e.name] === undefined) {
        finalConfig[subConfig].plugins[e.name] = { config: {} };
      }
    }
  });
}

export function serializeUCPConfig(
  sparseConfig: { [key: string]: unknown },
  fullConfig: { [key: string]: unknown },
  sparseExtensions: Extension[],
  fullExtensions: Extension[],
  configurationQualifier: { [key: string]: ConfigurationQualifier },
) {
  const finalConfig: UCP3SerializedUserConfig = {
    'specification-version': '1.0.0',
    active: true,
    'config-sparse': { modules: {}, plugins: {}, 'load-order': [] },
    'config-full': { modules: {}, plugins: {}, 'load-order': [] },
  };

  saveUCPConfigPart(
    finalConfig,
    'config-full',
    fullConfig,
    fullExtensions,
    fullExtensions,
    configurationQualifier,
  );
  saveUCPConfigPart(
    finalConfig,
    'config-sparse',
    sparseConfig,
    sparseExtensions,
    fullExtensions,
    configurationQualifier,
  );

  return finalConfig;
}

export function toYaml(obj: unknown) {
  return yamlStringify(obj, { aliasDuplicateObjects: false });
}

// Save configuration
export async function saveUCPConfig(
  sparseConfig: { [key: string]: unknown },
  fullConfig: { [key: string]: unknown },
  sparseExtensions: Extension[],
  fullExtensions: Extension[],
  filePath: string,
  configurationQualifier: { [key: string]: ConfigurationQualifier },
) {
  await writeTextFile(
    filePath,
    toYaml(
      serializeUCPConfig(
        sparseConfig,
        fullConfig,
        sparseExtensions,
        fullExtensions,
        configurationQualifier,
      ),
    ),
  );

  return `Saved!`;
}
