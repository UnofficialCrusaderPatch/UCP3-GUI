import { ExtensionsState } from '../../../function/extensions/extensions-state';
import { ConfigEntry, Extension } from '../../../config/ucp/common';
import {
  ConfigMetaContent,
  ConfigMetaContentDB,
  ConfigMetaObjectDB,
} from '../../../config/ucp/config-merge/objects';
import Logger from '../../../util/scripts/logging';

const LOGGER = new Logger('extension-configuration.ts');

type ConfigurationDBBuildingResult = {
  status: number;
  state: ExtensionsState;
};

function buildConfigMetaContent(extName: string, k: string, v: unknown) {
  let truekey = k;
  let qualifier = 'unspecified';
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
      entity: extName,
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
  activeExtensions: Extension[],
) {
  // ae has the order that the highest is the last added.
  const ae = [...activeExtensions];
  // So we reverse it
  ae.reverse();

  LOGGER.msg(
    `Activated extensions ${ae
      .map((ex) => `${ex.name}-${ex.version}`)
      .join(', ')}`,
  ).info();

  const db: ConfigMetaObjectDB = {};

  const errors: string[] = [];
  const warnings: string[] = [];

  ae.forEach((ext) => {
    Object.entries(ext.configEntries).forEach(([url, data]) => {
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
            const w = `Suggested value by extension ('${ext.name}') dropped because of a required value from previously activated extension ('${currentM.entity}')`;
            LOGGER.msg(w).warn();
            warnings.push(w);
            return;
          }
          if (
            currentM.qualifier === 'suggested' &&
            cmc.qualifier === 'suggested'
          ) {
            const w = `Suggested value by extension ('${currentM.entity}') overriden by suggested value from later activated extension ('${ext.name}')`;
            LOGGER.msg(w).warn();
            warnings.push(w);
            return;
          }
          if (
            currentM.qualifier === 'suggested' &&
            cmc.qualifier === 'required'
          ) {
            const w = `Suggested value by extension ('${currentM.entity}') overriden by required value from later activated extension ('${ext.name}')`;
            LOGGER.msg(w).warn();
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
              const e = `Incompatible extension ('${ext.name}') and ('${currentM.entity}') because they both require different values for feature '${url}'`;
              LOGGER.msg(e).warn();
              errors.push(e);
            }
          }
        }

        m[key] = {
          entity: ext.name,
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
      extensionsState.activeExtensions,
    ),
  } as ExtensionsState;
}

export {
  buildExtensionConfigurationDB,
  buildConfigMetaContentDB,
  buildConfigMetaContent,
};
export type { ConfigurationDBBuildingResult };
