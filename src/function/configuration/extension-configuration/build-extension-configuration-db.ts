import { Extension } from '../../../config/ucp/common';
import {
  ConfigMetaContent,
  ConfigMetaContentDB,
  ConfigMetaObject,
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

const LOGGER = new Logger('extension-configuration.ts');

type Action = 'DROP' | 'OVERRIDE';

type Success = {
  status: 'ok';
  action: Action;
  override: Override;
  warning: string;
};

type Fail = {
  status: 'error';
  error: string;
  action: Action;
  override: Override;
  warning: string;
};

type PotentialOverrideResult = Success | Fail;

function processPotentialOverride(
  ext: Extension,
  url: string,
  key: string,
  existingCMC: ConfigMetaContent,
  cmc: ConfigMetaContent,
): PotentialOverrideResult {
  // Default fallback result
  let result: PotentialOverrideResult = {
    status: 'error',
    action: 'DROP',
    error: `unhandled combination of qualifiers detected: '${existingCMC.qualifier}' and '${cmc.qualifier}'`,
    warning: `unhandled combination of qualifiers detected: '${existingCMC.qualifier}' and '${cmc.qualifier}'`,
    override: createOverride(cmc, existingCMC, url),
  };

  if (existingCMC.qualifier === 'required' && cmc.qualifier === 'suggested') {
    // As this should be overridden by something else we don't add this key.
    // Thus, cmc is dropped
    const action = 'DROP';
    const override = createOverride(cmc, existingCMC, url);
    const warning = `${key} for '${url}' ${cmc.qualifier} by higher priority extension ('${ext.name}') overridden by a ${existingCMC.qualifier} value from a lower priority extension ('${existingCMC.entityName}')`;

    result = {
      status: 'ok',
      action,
      warning,
      override,
    };
  }

  // If extension set key to suggested
  // and a later extension wants a suggested value
  else if (
    existingCMC.qualifier === 'suggested' &&
    cmc.qualifier === 'suggested'
  ) {
    const action = 'OVERRIDE';
    const override = createOverride(existingCMC, cmc, url);
    const warning = `${key} for '${url}' ${existingCMC.qualifier} by lower priority extension ('${existingCMC.entityName}') overridden by ${cmc.qualifier} value from a higher priority extension ('${ext.name}')`;

    result = {
      status: 'ok',
      action,
      warning,
      override,
    };
  }

  // If extension set key to suggested
  // and a later extension wants a required value
  else if (
    existingCMC.qualifier === 'suggested' &&
    cmc.qualifier === 'required'
  ) {
    const action = 'OVERRIDE';
    const override = createOverride(existingCMC, cmc, url);
    const warning = `${key} for '${url}' ${existingCMC.qualifier} by lower priority extension ('${existingCMC.entityName}') overridden by ${cmc.qualifier} value from a higher priority extension ('${ext.name}')`;

    result = {
      status: 'ok',
      action,
      warning,
      override,
    };
  }

  // If extension set key to required
  // and a later extension wants a required value
  else if (
    existingCMC.qualifier === 'required' &&
    cmc.qualifier === 'required'
  ) {
    if (compareObjects(existingCMC.content, cmc.content)) {
      // We assume the latter required came later in time and is more authorative than the former
      const action = 'OVERRIDE';
      const override = createOverride(existingCMC, cmc, url);
      const warning = `${key} for '${url}' ${cmc.qualifier} by higher priority extension ('${ext.name}') overridden by the same ${existingCMC.qualifier} value from a lower priority extension ('${existingCMC.entityName}')`;

      result = {
        status: 'ok',
        action,
        warning,
        override,
      };
    } else {
      // TODO: Should we assume the latter required came later in time and is more authorative than the former
      // and therefore override? or drop?
      const action = 'DROP';
      const override = createOverride(cmc, existingCMC, url);
      const warning = `${key} for '${url}' ${cmc.qualifier} by higher priority extension ('${ext.name}') overridden by a different ${existingCMC.qualifier} value from a lower priority extension ('${existingCMC.entityName}')`;

      const e = `Incompatible extension ('${ext.name}') and ('${existingCMC.entityName}') because they both have different ${key} ${existingCMC.qualifier} for feature '${url}'`;

      LOGGER.msg(e).error();

      result = {
        status: 'error',
        action,
        override,
        warning,
        error: e,
      };
    }
  }

  return result;
}

function buildExtensionConfigurationDBFromActiveExtensions(
  activeExtensions: Extension[],
) {
  // ae has the order that the highest is the last added.
  const ae = [...activeExtensions];
  // So we reverse it: we process it from lowest to highest priority
  ae.reverse();

  // This object collects per url a config meta object
  const db: ConfigMetaObjectDB = {};

  const errors: string[] = [];
  const warnings: string[] = [];
  const overrides: Map<string, Override[]> = new Map<string, Override[]>();

  // We walk through the extensions from bottom to top
  ae.forEach((ext) => {
    // and go through each config entry
    Object.entries(ext.configEntries).forEach(([url, configEntryData]) => {
      // Is a CMO already present for this url?
      // If so, this means a previous extension already set this url to some value
      // If not create a new one
      const existingCMO: ConfigMetaObject = db[url] ?? {
        url,
        modifications: {},
      };

      // build ConfigMetaContentDB
      const cmcDB: ConfigMetaContentDB = buildConfigMetaContentDB(
        ext,
        configEntryData,
      );

      // create empty object to be filled with entries that overridde currently present
      // meta object for url & key
      const overridden: ConfigMetaContentDB = {};

      const applyOverride = (key: string, cmc: ConfigMetaContent) => {
        overridden[key] = {
          type: 'extension',
          entity: ext,
          entityName: ext.name,
          content: cmc.content,
          qualifier: cmc.qualifier,
        } as ConfigMetaContent;
      };

      // For each property in the ConfigMetaContentDB
      // e.g. property "value"
      Object.entries(cmcDB).forEach(([key, cmc]) => {
        // e.g., for the key named "value", we do the following:
        // Get the existing cmc for this key
        // Which exists if any previous extensions set an entry
        const existingCMC: ConfigMetaContent = existingCMO.modifications[key];

        if (existingCMC === undefined) {
          // If there was no ConfigMetaContent set yet,
          // It means no extension has set this url.key yet
          // For e.g. key "value" update the config meta content
          applyOverride(key, cmc);

          // Since there isn't any override possible if existing wasn't set yet,
          // we return
          return;
        }

        // process the potential override based on the qualifiers and contents
        const result = processPotentialOverride(
          ext,
          url,
          key,
          existingCMC,
          cmc,
        );

        // Check the result for error
        if (result.status === 'error') {
          LOGGER.msg(
            `${url} from ${ext.name} was dropped because of error`,
          ).warn();

          errors.push(result.error);

          // status === 'ok'
        }

        if (result.action === 'DROP') {
          LOGGER.msg(
            `${url} from ${ext.name} was dropped because of override`,
          ).debug();

          warnings.push(result.warning);

          const n = ext.name;

          if (!overrides.has(n)) {
            overrides.set(n, [result.override]);
          } else {
            overrides.get(n)!.push(result.override);
          }
        } else if (result.action === 'OVERRIDE') {
          warnings.push(result.warning);

          // Set override for the previous extension
          // which value will be overridden by cmc
          const n = existingCMC.entityName;

          if (!overrides.has(n)) {
            overrides.set(n, [result.override]);
          } else {
            overrides.get(n)!.push(result.override);
          }

          applyOverride(key, cmc);
        }
      });

      // Override existing cmo with overrides if present
      // e.g. if both the existing and the overridden
      // define meta content for key "value", only the overridden
      // one is kept
      // TODO: this is optimized code, we could also do this step
      // after each iteration over "key"
      db[url] = {
        ...existingCMO,
        modifications: {
          ...existingCMO.modifications,
          ...overridden,
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

/**
 * Builds configuration object based on list of active extensions
 * In essence, every config entry in an extension has a url
 * Every url has some keys, such as "value" for which meta info can be defined.
 * An example of meta info is "required-value: false" which contains a qualifier and content
 * for the key "value"
 *
 * In the result, there can only be one meta information per url & key combination.
 * This is because suggested qualifiers override each other, and required qualifiers retain
 * the (first) required item.
 *
 * In order to make up for this loss of information, a list of overrides, warnings, and errors is kept
 * Note that errors means the configuration is in an erroneous state.
 *
 * @param activeExtensions the active extensions in priority order (first element is top priority)
 * @returns
 */
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
