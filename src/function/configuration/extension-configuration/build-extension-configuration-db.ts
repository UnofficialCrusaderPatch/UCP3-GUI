import { Extension } from '../../../config/ucp/common';
import {
  ConfigMetaContent,
  ConfigMetaObjectDB,
} from '../../../config/ucp/config-merge/objects';
import { Override } from '../overrides';
import { ConfigurationState } from '../state';
import { ExtensionsState } from '../../extensions/extensions-state';
import Logger from '../../../util/scripts/logging';
import { buildExtensionsDefinedConfig } from './extensions-defined-config';
import { buildConfigMetaContentDB } from './build-config-meta-content-db';
import { createOverride } from './create-override';
import { compareObjects } from '../../../util/scripts/objectCompare';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { buildExtensionConfigurationDB as V2 } from './build-extension-configuration-db-v2';

const LOGGER = new Logger('extension-configuration.ts');

export function buildExtensionConfigurationDBFromActiveExtensions(
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

          // If extension set key to required
          // and a later extension wants a suggested value
          if (
            currentModifications.qualifier === 'required' &&
            cmc.qualifier === 'suggested'
          ) {
            const w = `value for '${url}' suggested by higher priority extension ('${ext.name}') overridden by a required value from a lower priority extension ('${currentModifications.entityName}')`;
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

          // If extension set key to suggested
          // and a later extension wants a suggested value
          if (
            currentModifications.qualifier === 'suggested' &&
            cmc.qualifier === 'suggested'
          ) {
            const w = `value for '${url}' suggested by lower priority extension ('${currentModifications.entityName}') overridden by suggested value from a higher priority extension ('${ext.name}')`;
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

          // If extension set key to suggested
          // and a later extension wants a required value
          if (
            currentModifications.qualifier === 'suggested' &&
            cmc.qualifier === 'required'
          ) {
            const w = `value for '${url}' suggested by lower priority extension ('${currentModifications.entityName}') overridden by required value from a higher priority extension ('${ext.name}')`;
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

          // If extension set key to required
          // and a later extension wants a required value
          if (
            currentModifications.qualifier === 'required' &&
            cmc.qualifier === 'required'
          ) {
            if (!compareObjects(currentModifications.content, cmc.content)) {
              const e = `Incompatible extension ('${ext.name}') and ('${currentModifications.entityName}') because they both require different value for feature '${url}'`;
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
// eslint-disable-next-line import/prefer-default-export
export function buildExtensionConfigurationDB(
  extensionsState: ExtensionsState,
) {
  return {
    ...extensionsState,
    configuration: buildExtensionConfigurationDBFromActiveExtensions(
      extensionsState.activeExtensions,
    ),
  } as ExtensionsState;
}
