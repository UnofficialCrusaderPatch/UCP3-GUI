import {
  ConfigEntry,
  OptionEntry,
  PermissionStatus,
  Extension,
  NumberContents,
  ChoiceContents,
} from './common';
import { isChoiceValuePermittedByConfigs } from './permissions-choice';
import { isNumberValuePermittedByConfigs } from './permissions-number';
import { isSetValuePermittedByConfigs } from './permissions-set';

function isValuePermittedByConfig(
  value: unknown,
  config: ConfigEntry,
  configName: string,
): PermissionStatus {
  const configValueDef = config.contents;

  const requiredValue = configValueDef['required-value'];
  const suggestedValue = configValueDef['suggested-value'];

  if (requiredValue !== undefined && value !== requiredValue) {
    return {
      status: 'illegal',
      reason: `value (${value}) does not match the value (${requiredValue}) required by ${configName}`,
      by: configName,
    } as PermissionStatus;
  }

  if (suggestedValue !== undefined && value !== suggestedValue) {
    return {
      status: 'warning',
      reason: `value (${value}) does not match the value (${suggestedValue}) suggested by ${configName}`,
      by: configName,
    };
  }
  // We should never get here, but checking this is not the responsibility of value permittance checks.
  // The validity of a config should be checked somewhere else!

  return {
    status: 'OK',
  } as PermissionStatus;
}

function isValuePermittedByConfigs(
  value: unknown,
  spec: OptionEntry,
  extensions: Extension[],
): PermissionStatus {
  // eslint-disable-next-line no-restricted-syntax
  for (const ext of extensions) {
    const config = ext.configEntries;
    const configDemands = config[spec.url];

    if (configDemands !== undefined) {
      const r = isValuePermittedByConfig(value, configDemands, ext.name);
      if (r.status !== 'OK') {
        return r;
      }
    }
  }

  return {
    status: 'OK',
    reason: '',
    by: '',
  };
}

function isValuePermitted(
  value: unknown,
  spec: OptionEntry,
  extensions: Extension[],
) {
  /* 	if(spec.type !== typeof(value)) {
          return {
              status: "illegal", 
              reason: `type of the value (${typeof(value)}) does not match spec type (${spec.type})`,
              by: "spec",
          };
      } */
  const valueDef = spec.contents.value;
  if (spec.contents.type === 'number') {
    const numberValue = value as number;

    const { min, max } = spec.contents as NumberContents;

    if (min !== undefined) {
      if (numberValue < (min as number)) {
        return {
          status: 'illegal',
          reason: `value (${numberValue}) too low (${min})`,
          by: 'spec',
        };
      }
    }
    if (max !== undefined) {
      if (numberValue > (max as number)) {
        return {
          status: 'illegal',
          reason: `value (${numberValue}) too high (${max})`,
          by: 'spec',
        };
      }
    }
    return isNumberValuePermittedByConfigs(numberValue, spec, extensions);
  }

  if (spec.contents.type === 'choice') {
    const choiceValue = value as string;
    const { choices } = spec.contents as ChoiceContents;

    // TEMP: this will not work as index of, except if it is the same object, can this be?
    // But at the same time, a string is set at the end
    // this seems to need a rework, temporary band-aid to allow build
    const valueIndex = choices.indexOf(
      choiceValue as unknown as {
        name: string;
        text: string;
        enabled: string;
        subtext: string;
      },
    );
    if (valueIndex === -1) {
      return {
        status: 'illegal',
        reason: `choice (${choiceValue}) not among the available options ${JSON.stringify(
          choices,
        )}`,
        by: 'spec',
      };
    }

    return isChoiceValuePermittedByConfigs(choiceValue, spec, extensions);
  }

  if (spec.contents.type === 'set') {
    return isSetValuePermittedByConfigs(value as [], spec, extensions);
  }

  if (spec.contents.type === 'boolean') {
    return isValuePermittedByConfigs(value as boolean, spec, extensions);
  }

  if (spec.contents.type === 'string') {
    return isValuePermittedByConfigs(value as string, spec, extensions);
  }

  if (spec.contents.type === 'filepath') {
    return isValuePermittedByConfigs(value as string, spec, extensions);
  }

  throw new Error(`unrecognized type: ${spec.contents.type}`);
}

export {
  isValuePermitted,
  isChoiceValuePermittedByConfigs,
  isNumberValuePermittedByConfigs,
  isSetValuePermittedByConfigs,
  isValuePermittedByConfigs,
};
