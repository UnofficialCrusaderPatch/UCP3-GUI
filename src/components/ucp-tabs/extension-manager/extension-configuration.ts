import { ExtensionsState } from '../../../function/extensions/extensions-state';
import { ConfigEntry, Extension } from '../../../config/ucp/common';
import {
  ConfigMetaContent,
  ConfigMetaContentDB,
  ConfigMetaObjectDB,
} from '../../../config/ucp/config-merge/objects';
import Logger from '../../../util/scripts/logging';
import { Override } from '../../../function/configuration/overrides';
import { buildExtensionsDefinedConfig } from './extension-configuration/extensions-defined-config';
import { ConfigurationState } from '../../../function/configuration/state';

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
  // So we reverse it: we process it from lowest to highest priority
  ae.reverse();

  const db: ConfigMetaObjectDB = {};

  const errors: string[] = [];
  const warnings: string[] = [];
  const overrides: Map<string, Override[]> = new Map<string, Override[]>();

  ae.forEach((ext) => {
    Object.entries(ext.configEntries).forEach(([url, configEntryData]) => {
      // Is a CMO already present for this url?
      let currentCMO = db[url];
      // If not, set a new value
      if (currentCMO === undefined) {
        currentCMO = { url, modifications: {} };
      }

      // build ConfigMetaContentDB
      const m = buildConfigMetaContentDB(ext, configEntryData);

      // For each property in the ConfigMetaContentDB
      // e.g. property "value"
      Object.entries(m).forEach(([key, cmc]) => {
        // e.g., for the key named "value", we do the following:
        // Get the currentModifications for this key
        const currentModifications = currentCMO.modifications[key];
        if (currentModifications !== undefined) {
          // Process the four different types of overriding behavior and set warnings and overrides
          if (
            currentModifications.qualifier === 'required' &&
            cmc.qualifier === 'suggested'
          ) {
            const w = `Value for '${url}' suggested by higher priority extension ('${ext.name}') overridden by a required value from a lower priority extension ('${currentModifications.entityName}')`;
            // LOGGER.msg(w).warn();
            warnings.push(w);

            const n = ext.name;
            if (!overrides.has(n)) {
              overrides.set(n, []);
            }

            overrides
              .get(n)!
              .push(createOverride(cmc, currentModifications, url));

            // As this should be overridden by something else we delete the key.
            // We could also set the m[key] value to the currentModifications object. Same effect.
            delete m[key];

            return;
          }
          if (
            currentModifications.qualifier === 'suggested' &&
            cmc.qualifier === 'suggested'
          ) {
            const w = `Value for '${url}' suggested by lower priority extension ('${currentModifications.entityName}') overridden by suggested value from a higher priority extension ('${ext.name}')`;
            // LOGGER.msg(w).warn();
            warnings.push(w);

            const n = currentModifications.entityName;
            if (!overrides.has(n)) {
              overrides.set(n, []);
            }

            overrides
              .get(n)!
              .push(createOverride(currentModifications, cmc, url));

            return;
          }
          if (
            currentModifications.qualifier === 'suggested' &&
            cmc.qualifier === 'required'
          ) {
            const w = `Value for '${url}' suggested by lower priority extension ('${currentModifications.entityName}') overridden by required value from a higher priority extension ('${ext.name}')`;
            // LOGGER.msg(w).warn();
            warnings.push(w);

            const n = currentModifications.entityName;
            if (!overrides.has(n)) {
              overrides.set(n, []);
            }

            overrides
              .get(n)!
              .push(createOverride(currentModifications, cmc, url));

            return;
          }
          if (
            currentModifications.qualifier === 'required' &&
            cmc.qualifier === 'required'
          ) {
            // TODO: remove this hack and replace it with a proper equality check
            if (
              JSON.stringify(currentModifications.content) !==
              JSON.stringify(cmc.content)
            ) {
              const e = `Incompatible extension ('${ext.name}') and ('${currentModifications.entityName}') because they both require different values for feature '${url}'`;
              LOGGER.msg(e).warn();
              errors.push(e);

              // As this should be overridden by something else we delete the key.
              // We could also set the m[key] value to the currentModifications object. Same effect.
              delete m[key];
            }

            return;
          }
        }

        // If there was no ConfigMetaContent set yet, set it
        // For e.g. key "value" update the config meta content
        m[key] = {
          type: 'extension',
          entity: ext,
          entityName: ext.name,
          content: cmc.content,
          qualifier: cmc.qualifier,
        } as ConfigMetaContent;
      });

      // Add m to the modifications of the currentCMO
      db[url] = {
        ...currentCMO,
        modifications: {
          ...currentCMO.modifications,
          // TODO: BUG: m shouldn't always be added, it depends on the required/suggested situation
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
    ...buildExtensionsDefinedConfig(db, activeExtensions),
  } as ConfigurationState;
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
