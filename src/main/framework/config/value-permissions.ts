import './common';

type Configs = { [key: string]: ConfigEntry }[];

function isNumberValuePermittedByConfigs(
  value: number,
  spec: OptionEntry,
  configs: Configs
) {
  if (spec === undefined || spec.url === undefined) {
    return {
      status: 'error',
      reason: 'invalid spec',
      by: '',
    };
  }
  // eslint-disable-next-line no-restricted-syntax
  for (const config of configs) {
    if (config[spec.url] !== undefined) {
      const configDemands = config[spec.url];
      const configValueDef = configDemands.value;
      const requiredValue = configValueDef['required-value'];
      if (requiredValue !== undefined) {
        if (requiredValue !== value) {
          return {
            status: 'illegal',
            reason: `value (${value}) does match the value (${requiredValue}) required by ${config.name}`,
            by: config.name,
          };
        }
      }
      const requiredRange = configValueDef['required-range'];
      if (requiredRange !== undefined) {
        if (value < requiredRange.min) {
          return {
            status: 'illegal',
            reason: `value (${value}) too low (${requiredRange.min})`,
            by: config.name,
          };
        }
        if (value > requiredRange.max) {
          return {
            status: 'illegal',
            reason: `value (${value}) too high (${requiredRange.max})`,
            by: config.name,
          };
        }
      }

      const suggestedValue = configValueDef['suggested-value'];
      if (suggestedValue !== undefined && value !== suggestedValue) {
        return {
          status: 'warning',
          reason: `value (${value}) does not match value (${suggestedValue}) suggested by ${config.name}`,
          by: config.name,
        };
      }
      const suggestedRange = configValueDef['suggested-range'];
      if (suggestedRange !== undefined) {
        if (value < suggestedRange.min) {
          return {
            status: 'warning',
            reason: `value (${value}) might be too low (${suggestedRange.min}) as suggested by ${config.name}`,
            by: config.name,
          };
        }
        if (value > suggestedRange.max) {
          return {
            status: 'warning',
            reason: `value (${value}) might be too high (${suggestedRange.max}) as suggested by ${config.name}`,
            by: config.name,
          };
        }
      }
    }
    if (config['all-else'] !== undefined) {
      // const allElse = config['all-else'];
      // if (allElse === 'denied') {
      //   return {
      //     status: 'illegal',
      //     reason: `${config.name} does not allow other options (${spec.url}) to be set`,
      //   };
      // }
    }
  }

  return {
    status: 'OK',
    reason: '',
    by: '',
  };
}

function isChoiceValuePermittedByConfigs(
  value: string,
  spec: OptionEntry,
  configs: Configs
) {
  // eslint-disable-next-line no-restricted-syntax
  for (const config of configs) {
    if (config[spec.url] !== undefined) {
      const configDemands = config[spec.url];
      const configValueDef = configDemands.value;

      const requiredValue = configValueDef['required-value'];
      if (requiredValue !== undefined && value !== requiredValue) {
        return {
          status: 'illegal',
          reason: `choice (${value}) does not match the choice (${requiredValue}) required by ${config.name}`,
          by: config.name,
        };
      }

      const requiredValues = configValueDef['required-values'];
      if (
        requiredValues !== undefined &&
        requiredValues.indexOf(value.toString()) === -1
      ) {
        return {
          status: 'illegal',
          reason: `choice (${value}) not a valid choice (${JSON.stringify(
            requiredValues
          )}) as required by ${config.name}`,
          by: config.name,
        };
      }

      const suggestedValue = configValueDef['suggested-value'];
      if (suggestedValue !== undefined && value !== suggestedValue) {
        return {
          status: 'warning',
          reason: `choice (${value}) does not match the choice (${suggestedValue}) suggested by ${config.name}`,
          by: config.name,
        };
      }

      const suggestedValues = configValueDef['suggested-values'];
      if (
        suggestedValues !== undefined &&
        suggestedValues.indexOf(value.toString()) === -1
      ) {
        return {
          status: 'warning',
          reason: `choice (${value}) not a suggested choice (${JSON.stringify(
            suggestedValues
          )}) as suggested by ${config.name}`,
          by: config.name,
        };
      }
    }
  }

  return {
    status: 'OK',
    reason: '',
    by: '',
  };
}

function isSetValuePermitted(
  values: unknown[],
  spec: OptionEntry,
  configs: Configs
) {
  const valueSet = new Set(values);
  // eslint-disable-next-line no-restricted-syntax
  for (const config of configs) {
    if (config[spec.url] !== undefined) {
      const configDemands = config[spec.url];
      const configValueDef = configDemands.value;

      const requiredExclusive = configValueDef['required-exclusive'];
      if (requiredExclusive !== undefined) {
        if (
          configValueDef['required-values'].length !== valueSet.size ||
          ![...configValueDef['required-values']].every((value: unknown) =>
            valueSet.has(value)
          )
        ) {
          return {
            status: 'error',
            reason: `value (${JSON.stringify(
              valueSet
            )}) does not match value (${JSON.stringify(
              configValueDef['required-values']
            )}) as required by ${configDemands.name}`,
            by: configDemands.name,
          };
        }
      }

      const requiredInclusive = configValueDef['required-inclusive'];
      if (requiredInclusive !== undefined) {
        // This is elaborate javascript to check if value contains the required values
        if (
          ![...configValueDef['required-values']].every((value) =>
            valueSet.has(value)
          )
        ) {
          return {
            status: 'error',
            reason: `value (${JSON.stringify(
              valueSet
            )}) is missing some elements (${JSON.stringify(
              configValueDef['required-values']
            )}) as required by ${configDemands.name}`,
            by: configDemands.name,
          };
        }
      }

      const suggestedExclusive = configValueDef['suggested-exclusive'];
      if (suggestedExclusive !== undefined) {
        if (
          configValueDef['suggested-values'].length !== valueSet.size ||
          ![...configValueDef['suggested-values']].every((value) =>
            valueSet.has(value)
          )
        ) {
          return {
            status: 'error',
            reason: `value (${JSON.stringify(
              valueSet
            )}) does not match value (${JSON.stringify(
              configValueDef['suggested-values']
            )}) as required by ${configDemands.name}`,
            by: configDemands.name,
          };
        }
      }

      const suggestedInclusive = configValueDef['suggested-inclusive'];
      if (suggestedInclusive !== undefined) {
        // This is elaborate javascript to check if value contains the required values
        if (
          ![...configValueDef['suggested-values']].every((value) =>
            valueSet.has(value)
          )
        ) {
          return {
            status: 'error',
            reason: `value (${JSON.stringify(
              valueSet
            )}) is missing some elements (${JSON.stringify(
              configValueDef['suggested-values']
            )}) as required by ${configDemands.name}`,
            by: configDemands.name,
          };
        }
      }
    }
  }

  return {
    status: 'OK',
    reason: '',
    by: '',
  };
}

function isValuePermittedByConfigs(
  value: unknown,
  spec: OptionEntry,
  configs: Configs
) {
  // eslint-disable-next-line no-restricted-syntax
  for (const config of configs) {
    const configDemands = config[spec.url];
    const configValueDef = configDemands.value;

    const requiredValue = configValueDef['required-value'];
    const suggestedValue = configValueDef['suggested-value'];

    if (requiredValue !== undefined && value !== requiredValue) {
      return {
        status: 'illegal',
        reason: `value (${value}) does not match the value (${requiredValue}) required by ${config.name}`,
        by: config.name,
      };
    }

    if (suggestedValue !== undefined && value !== suggestedValue) {
      return {
        status: 'warning',
        reason: `value (${value}) does not match the value (${suggestedValue}) suggested by ${config.name}`,
        by: config.name,
      };
    }
    // We should never get here, but checking this is not the responsibility of value permittance checks.
    // The validity of a config should be checked somewhere else!
  }

  return {
    status: 'OK',
    reason: '',
    by: '',
  };
}

function isValuePermitted(value: unknown, spec: OptionEntry, configs: Configs) {
  /* 	if(spec.type !== typeof(value)) {
          return {
              status: "illegal", 
              reason: `type of the value (${typeof(value)}) does not match spec type (${spec.type})`,
              by: "spec",
          };
      } */
  const valueDef = spec.value;
  if (spec.type === 'number') {
    const numberValue = value as number;

    const valueRange = valueDef.range;

    if (valueRange !== undefined) {
      if (numberValue < (valueRange.min as number)) {
        return {
          status: 'illegal',
          reason: `value (${numberValue}) too low (${valueRange.min})`,
          by: 'spec',
        };
      }
      if (numberValue > (valueRange.max as number)) {
        return {
          status: 'illegal',
          reason: `value (${numberValue}) too high (${valueRange.max})`,
          by: 'spec',
        };
      }
    }
    return isNumberValuePermittedByConfigs(numberValue, spec, configs);
  }

  if (spec.type === 'choice') {
    const choiceValue = value as string;
    const { choices } = valueDef;
    const valueIndex = choices.indexOf(choiceValue);
    if (valueIndex === -1) {
      return {
        status: 'illegal',
        reason: `choice (${choiceValue}) not among the available options ${JSON.stringify(
          choices
        )}`,
        by: 'spec',
      };
    }

    return isChoiceValuePermittedByConfigs(choiceValue, spec, configs);
  }

  if (spec.type === 'set') {
    return isSetValuePermitted(value as [], spec, configs);
  }

  if (spec.type === 'boolean') {
    return isValuePermittedByConfigs(value as boolean, spec, configs);
  }

  if (spec.type === 'string') {
    return isValuePermittedByConfigs(value as string, spec, configs);
  }

  if (spec.type === 'filepath') {
    return isValuePermittedByConfigs(value as string, spec, configs);
  }

  throw new Error(`unrecognized type: ${spec.type}`);
}

export {
  isValuePermitted,
  isChoiceValuePermittedByConfigs,
  isNumberValuePermittedByConfigs,
  isSetValuePermitted,
  isValuePermittedByConfigs,
};
