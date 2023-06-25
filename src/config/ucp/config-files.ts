/* eslint-disable no-param-reassign */
import { TFunction } from 'react-i18next';
import { writeTextFile, loadYaml } from 'tauri/tauri-files';
import Result from 'util/structs/result';
import { stringify as yamlStringify } from 'yaml';
import { Extension } from './common';

export async function loadConfigFromFile(filePath: string, t: TFunction) {
  const configRes: Result<
    {
      order: string[];
      modules: {
        [key: string]: {
          [key: string]: unknown;
        };
      };
      plugins: {
        [key: string]: {
          [key: string]: unknown;
        };
      };
    },
    unknown
  > = await loadYaml(filePath); // will only be one

  if (configRes.isErr()) {
    return {
      status: 'FAIL',
      message: `${configRes.err().get()}`,
    };
  }

  const config = configRes.getOrThrow();
  if (config.modules === undefined && config.plugins === undefined) {
    return {
      status: 'FAIL',
      message: t('gui-editor:config.not.valid'),
    };
  }

  const finalConfig: { [key: string]: unknown } = {};

  Object.entries(config.modules || {}).forEach(([key, value]) => {
    finalConfig[key] = value;
  });

  Object.entries(config.plugins || {}).forEach(([key, value]) => {
    finalConfig[key] = value;
  });

  return {
    status: 'OK',
    message: '',
    result: {
      config: finalConfig,
      order: config.order || [],
    },
  };
}

type ConfigPart = {
  'load-order': string[];
  modules: {
    [key: string]: {
      [key: string]: unknown;
    };
  };
  plugins: {
    [key: string]: {
      [key: string]: unknown;
    };
  };
};

type UCP3SerializedUserConfig = {
  active: boolean;
  'specification-version': string;
  'config-sparse': ConfigPart;
  'config-full': ConfigPart;
};

function saveUCPConfigPart(
  finalConfig: UCP3SerializedUserConfig,
  configPart: 'config-full' | 'config-sparse',
  config: { [key: string]: unknown },
  extensions: Extension[]
) {
  console.debug(finalConfig[configPart]);

  finalConfig[configPart]['load-order'] = extensions.map(
    (e: Extension) => `${e.name} == ${e.version}`
  );

  Object.entries(config)
    .filter(([key, value]) => value !== undefined)
    .forEach(([key, value]) => {
      const parts = key.split('.');
      const extName = parts[0];

      const ext = extensions.filter((ex) => ex.name === extName)[0];

      if (ext === undefined || ext === null) {
        console.error(`No extension found with name: ${extName}`);
      }

      const type = ext.type === 'module' ? 'modules' : 'plugins';

      if (finalConfig[configPart][type][extName] === undefined) {
        finalConfig[configPart][type][extName] = {};
      }

      const configParts = parts.slice(1);
      const partsdrop1 = configParts.slice(0, -1);
      const finalpart = configParts.slice(-1)[0];
      let fcp = finalConfig[configPart][type][extName];
      partsdrop1.forEach((part: string) => {
        if (fcp[part] === undefined) {
          fcp[part] = {};
        }
        fcp = fcp[part] as { [key: string]: unknown };
      });
      fcp[finalpart] = value;
    });

  extensions.forEach((e: Extension) => {
    if (e.type === 'module') {
      if (finalConfig[configPart].modules[e.name] === undefined) {
        finalConfig[configPart].modules[e.name] = {};
      }
    }
    if (e.type === 'plugin') {
      if (finalConfig[configPart].plugins[e.name] === undefined) {
        finalConfig[configPart].plugins[e.name] = {};
      }
    }
  });
}

// Save configuration
export async function saveUCPConfig(
  sparseConfig: { [key: string]: unknown },
  fullConfig: { [key: string]: unknown },
  sparseExtensions: Extension[],
  fullExtensions: Extension[],
  filePath: string
) {
  const finalConfig: UCP3SerializedUserConfig = {
    'specification-version': '1.0.0',
    active: true,
    'config-sparse': { modules: {}, plugins: {}, 'load-order': [] },
    'config-full': { modules: {}, plugins: {}, 'load-order': [] },
  };

  saveUCPConfigPart(finalConfig, 'config-full', fullConfig, fullExtensions);
  saveUCPConfigPart(
    finalConfig,
    'config-sparse',
    sparseConfig,
    sparseExtensions
  );

  await writeTextFile(
    filePath,
    yamlStringify(finalConfig, { aliasDuplicateObjects: false })
  );
}
