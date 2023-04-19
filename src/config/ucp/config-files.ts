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

// Save configuration
export async function saveUCPConfig(
  config: { [key: string]: unknown },
  filePath: string,
  extensions: Extension[]
) {
  const finalConfig: {
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
  } = { modules: {}, plugins: {}, order: [] };
  finalConfig.order = extensions.map(
    (e: Extension) => `${e.name} == ${e.version}`
  );
  console.debug(config);
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

      if (finalConfig[type][extName] === undefined) {
        finalConfig[type][extName] = {};
      }

      const configParts = parts.slice(1);
      const partsdrop1 = configParts.slice(0, -1);
      const finalpart = configParts.slice(-1)[0];
      let fcp = finalConfig[type][extName];
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
      if (finalConfig.modules[e.name] === undefined) {
        finalConfig.modules[e.name] = {};
      }
    }
    if (e.type === 'plugin') {
      if (finalConfig.plugins[e.name] === undefined) {
        finalConfig.plugins[e.name] = {};
      }
    }
  });

  await writeTextFile(filePath, yamlStringify(finalConfig));
}
