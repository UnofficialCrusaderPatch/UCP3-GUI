import { ConfigEntry, OptionEntry, Configs } from './common';

function isChoiceValuePermittedByConfig(
  value: string,
  config: ConfigEntry,
  configName: string
) {
  const configValueDef = config.value;

  const requiredValue = configValueDef['required-value'];
  if (requiredValue !== undefined && value !== requiredValue) {
    return {
      status: 'illegal',
      reason: `choice (${value}) does not match the choice (${requiredValue}) required by ${configName}`,
      by: configName,
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
      )}) as required by ${configName}`,
      by: configName,
    };
  }

  const suggestedValue = configValueDef['suggested-value'];
  if (suggestedValue !== undefined && value !== suggestedValue) {
    return {
      status: 'warning',
      reason: `choice (${value}) does not match the choice (${suggestedValue}) suggested by ${configName}`,
      by: configName,
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
      )}) as suggested by ${configName}`,
      by: configName,
    };
  }
  return {
    status: 'OK',
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

      const r = isChoiceValuePermittedByConfig(
        value,
        configDemands,
        'not implemented'
      );
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

export { isChoiceValuePermittedByConfig, isChoiceValuePermittedByConfigs };
