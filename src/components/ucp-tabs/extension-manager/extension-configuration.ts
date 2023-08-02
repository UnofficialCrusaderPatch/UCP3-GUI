import { ConfigEntry, ConfigEntryContents, Extension } from 'config/ucp/common';
import {
  ConfigMetaContent,
  ConfigMetaContentDB,
  ConfigMetaObject,
  ConfigMetaObjectDB,
} from 'config/ucp/config-merge/objects';
import { ExtensionsState } from 'function/global/types';
import { string } from 'yaml/dist/schema/common/string';

type ConfigurationDBBuildingResult = {
  status: number;
  state: ExtensionsState;
};

function buildConfigMetaContent(extName: string, k: string, v: unknown) {
  let truekey = k;
  let qualifier = 'required';
  if (k.startsWith('required-')) {
    // eslint-disable-next-line prefer-destructuring
    truekey = k.split('required-', 2)[1];
    qualifier = 'required';
  } else if (k.startsWith('suggested-')) {
    // eslint-disable-next-line prefer-destructuring
    truekey = k.split('suggested-', 2)[1];
    qualifier = 'suggested';
  }

  return {
    truekey,
    configMetaContent: {
      extension: extName,
      content: v,
      qualifier,
    } as ConfigMetaContent,
  };
}

function buildConfigMetaContentDB(extName: string, ce: ConfigEntry) {
  const m: ConfigMetaContentDB = {};

  Object.entries(ce.contents)
    .map(([k, v]) => buildConfigMetaContent(extName, k, v))
    .forEach(({ truekey, configMetaContent }) => {
      m[truekey] = configMetaContent;
    });

  return m;
}

function buildExtensionConfigurationDBFromActiveExtensions(
  activeExtensions: Extension[]
) {
  // ae has the order that the highest is the last added.
  const ae = [...activeExtensions];
  // So we reverse it
  ae.reverse();

  console.log('Activated extensions', ae);

  const db: ConfigMetaObjectDB = {};

  const errors: string[] = [];
  const warnings: string[] = [];

  ae.forEach((ext) => {
    Object.entries(ext.configEntries).forEach(([url, data]) => {
      const { contents } = data;

      let currentCMO = db[url];

      if (currentCMO === undefined) {
        currentCMO = { url, modifications: {} };
      }

      const m = buildConfigMetaContentDB(ext.name, data);

      Object.entries(m).forEach(([key, cmc]) => {
        const currentM = currentCMO.modifications[key];
        if (currentM !== undefined) {
          if (
            currentM.qualifier === 'required' &&
            cmc.qualifier === 'suggested'
          ) {
            const w = `Suggested value by extension ('${ext.name}') dropped because of a required value from previously activated extension ('${currentM.extension}')`;
            console.warn(w);
            warnings.push(w);
            return;
          }
          if (
            currentM.qualifier === 'suggested' &&
            cmc.qualifier === 'suggested'
          ) {
            const w = `Suggested value by extension ('${currentM.extension}') overriden by suggested value from later activated extension ('${ext.name}')`;
            console.warn(w);
            warnings.push(w);
            return;
          }
          if (
            currentM.qualifier === 'suggested' &&
            cmc.qualifier === 'required'
          ) {
            const w = `Suggested value by extension ('${currentM.extension}') overriden by required value from later activated extension ('${ext.name}')`;
            console.warn(w);
            warnings.push(w);
            return;
          }
          if (
            currentM.qualifier === 'required' &&
            cmc.qualifier === 'required'
          ) {
            // TODO: remove this hack and replace it with a proper equality check
            if (
              JSON.stringify(currentM.content) !== JSON.stringify(cmc.content)
            ) {
              const e = `Incompatible extension ('${ext.name}') and ('${currentM.extension}') because they both require different values for feature '${url}'`;
              console.warn(e);
              window.alert(e);
              errors.push(e);
            }
          }
        }

        m[key] = {
          extension: ext.name,
          content: cmc.content,
          qualifier: cmc.qualifier,
        } as ConfigMetaContent;
      });

      db[url] = {
        ...currentCMO,
        modifications: {
          ...currentCMO.modifications,
          ...m,
        },
      };
    });
  });

  let statusCode = 0;
  if (warnings.length > 0) {
    statusCode = 1;
  }
  if (errors.length > 0) {
    statusCode = 2;
  }

  return {
    state: db,
    warnings,
    errors,
    statusCode,
  };
}

// TODO: also do range checks in this function? Better in a separate function I guess
// Or perhaps better to do range checks on discovery of extension
function buildExtensionConfigurationDB(extensionsState: ExtensionsState) {
  return {
    ...extensionsState,
    configuration: buildExtensionConfigurationDBFromActiveExtensions(
      extensionsState.activeExtensions
    ),
  } as ExtensionsState;
}

export {
  buildExtensionConfigurationDB,
  buildConfigMetaContentDB,
  buildConfigMetaContent,
};
export type { ConfigurationDBBuildingResult };
