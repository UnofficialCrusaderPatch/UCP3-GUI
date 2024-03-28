import { ExtensionsState } from '../../../function/extensions/extensions-state';
import { ConfigEntry, Extension } from '../../../config/ucp/common';
import {
  ConfigMetaContent,
  ConfigMetaContentDB,
  ConfigMetaObjectDB,
} from '../../../config/ucp/config-merge/objects';
import Logger from '../../../util/scripts/logging';
import { Override } from '../../../function/configuration/overrides';

const LOGGER = new Logger('extension-configuration.ts');

type ConfigurationDBBuildingResult = {
  status: number;
  state: ExtensionsState;
};

function buildConfigMetaContent(
  ext: Extension | undefined,
  k: string,
  v: unknown,
) {
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
    configMetaContent:
      ext === undefined
        ? ({
            type: 'user',
            entityName: 'user',
            content: v,
            qualifier,
          } as ConfigMetaContent)
        : ({
            type: 'extension',
            entity: ext,
            entityName: ext.name,
            content: v,
            qualifier,
          } as ConfigMetaContent),
  };
}

function buildConfigMetaContentDB(ext: Extension | undefined, ce: ConfigEntry) {
  const m: ConfigMetaContentDB = {};

  Object.entries(ce.contents)
    .map(([k, v]) => buildConfigMetaContent(ext, k, v))
    .forEach(({ truekey, configMetaContent }) => {
      m[truekey] = configMetaContent;
    });

  return m;
}

export function buildConfigMetaContentDBForUser(ce: ConfigEntry) {
  return buildConfigMetaContentDB(undefined, ce);
}

const createOverride = (
  overridden: ConfigMetaContent,
  overriding: ConfigMetaContent,
  url: string,
) =>
  ({
    overridden:
      overridden.type === 'user'
        ? {
            type: 'user',
            qualifier: overridden.qualifier,
            url,
            value: overridden.content,
            name: overridden.entityName,
          }
        : {
            type: 'extension',
            entity: overridden.entity,
            qualifier: overridden.qualifier,
            url,
            value: overridden.content,
            name: overridden.entityName,
          },
    overriding:
      overriding.type === 'user'
        ? {
            type: 'user',
            qualifier: overriding.qualifier,
            url,
            value: overriding.content,
            name: overriding.entityName,
          }
        : {
            type: 'extension',
            entity: overriding.entity,
            qualifier: overriding.qualifier,
            url,
            value: overriding.content,
            name: overriding.entityName,
          },
  }) as Override;

function buildExtensionConfigurationDBFromActiveExtensions(
  activeExtensions: Extension[],
) {
  // ae has the order that the highest is the last added.
  const ae = [...activeExtensions];
  // So we reverse it
  ae.reverse();

  const db: ConfigMetaObjectDB = {};

  const errors: string[] = [];
  const warnings: string[] = [];
  const overrides: Map<string, Override[]> = new Map<string, Override[]>();

  ae.forEach((ext) => {
    Object.entries(ext.configEntries).forEach(([url, data]) => {
      let currentCMO = db[url];

      if (currentCMO === undefined) {
        currentCMO = { url, modifications: {} };
      }

      const m = buildConfigMetaContentDB(ext, data);

      Object.entries(m).forEach(([key, cmc]) => {
        const currentM = currentCMO.modifications[key];
        if (currentM !== undefined) {
          if (
            currentM.qualifier === 'required' &&
            cmc.qualifier === 'suggested'
          ) {
            const w = `Value for '${url}' suggested by higher priority extension ('${ext.name}') overridden by a required value from a lower priority extension ('${currentM.entityName}')`;
            // LOGGER.msg(w).warn();
            warnings.push(w);

            const n = ext.name;
            if (!overrides.has(n)) {
              overrides.set(n, []);
            }

            overrides.get(n)!.push(createOverride(cmc, currentM, url));

            return;
          }
          if (
            currentM.qualifier === 'suggested' &&
            cmc.qualifier === 'suggested'
          ) {
            const w = `Value for '${url}' suggested by lower priority extension ('${currentM.entityName}') overridden by suggested value from a higher priority extension ('${ext.name}')`;
            // LOGGER.msg(w).warn();
            warnings.push(w);

            const n = currentM.entityName;
            if (!overrides.has(n)) {
              overrides.set(n, []);
            }

            overrides.get(n)!.push(createOverride(currentM, cmc, url));

            return;
          }
          if (
            currentM.qualifier === 'suggested' &&
            cmc.qualifier === 'required'
          ) {
            const w = `Value for '${url}' suggested by lower priority extension ('${currentM.entityName}') overridden by required value from a higher priority extension ('${ext.name}')`;
            // LOGGER.msg(w).warn();
            warnings.push(w);

            const n = currentM.entityName;
            if (!overrides.has(n)) {
              overrides.set(n, []);
            }

            overrides.get(n)!.push(createOverride(currentM, cmc, url));

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
              const e = `Incompatible extension ('${ext.name}') and ('${currentM.entityName}') because they both require different values for feature '${url}'`;
              LOGGER.msg(e).warn();
              errors.push(e);
            }

            return;
          }
        }

        m[key] = {
          type: 'extension',
          entity: ext,
          entityName: ext.name,
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
    overrides,
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
