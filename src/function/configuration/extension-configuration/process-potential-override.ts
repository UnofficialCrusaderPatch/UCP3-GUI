import { Extension } from '../../../config/ucp/common';
import { ConfigMetaContent } from '../../../config/ucp/config-merge/objects';
import Logger from '../../../util/scripts/logging';
import { compareObjects } from '../../../util/scripts/objectCompare';
import { Override } from '../overrides';
import { createOverride } from './create-override';

const LOGGER = new Logger('process-potential-override.ts');

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

// eslint-disable-next-line import/prefer-default-export
export function processPotentialOverride(
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
