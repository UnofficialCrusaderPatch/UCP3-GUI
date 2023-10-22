import {
  ConfigEntry,
  OptionEntry,
  PermissionStatus,
  Extension,
} from './common';

function isNumberValuePermittedByConfig(
  value: number,
  config: ConfigEntry,
  configName: string,
): PermissionStatus {
  const configValueDef = config.contents;
  const requiredValue = configValueDef['required-value'];
  if (requiredValue !== undefined) {
    if (requiredValue !== value) {
      return {
        status: 'illegal',
        reason: `value (${value}) does match the value (${requiredValue}) required by ${configName}`,
        by: configName,
      };
    }
  }
  const requiredMin = configValueDef['required-min'];
  if (requiredMin !== undefined) {
    if (value < requiredMin) {
      return {
        status: 'illegal',
        reason: `value (${value}) too low (${requiredMin})`,
        by: configName,
      };
    }
  }
  const requiredMax = configValueDef['required-max'];
  if (requiredMax !== undefined) {
    if (value > requiredMax) {
      return {
        status: 'illegal',
        reason: `value (${value}) too high (${requiredMax})`,
        by: configName,
      };
    }
  }

  const suggestedValue = configValueDef['suggested-value'];
  if (suggestedValue !== undefined && value !== suggestedValue) {
    return {
      status: 'warning',
      reason: `value (${value}) does not match value (${suggestedValue}) suggested by ${configName}`,
      by: configName,
    };
  }
  const suggestedMin = configValueDef['suggested-min'];
  const suggestedMax = configValueDef['suggested-max'];
  if (suggestedMin !== undefined) {
    if (value < suggestedMin) {
      return {
        status: 'warning',
        reason: `value (${value}) might be too low (${suggestedMin}) as suggested by ${configName}`,
        by: configName,
      };
    }
  }
  if (suggestedMax !== undefined) {
    if (value > suggestedMax) {
      return {
        status: 'warning',
        reason: `value (${value}) might be too high (${suggestedMax}) as suggested by ${configName}`,
        by: configName,
      };
    }
  }

  return {
    status: 'OK',
    reason: '',
    by: '',
  };
}

function isNumberValuePermittedByConfigs(
  value: number,
  spec: OptionEntry,
  extensions: Extension[],
): PermissionStatus {
  if (spec === undefined || spec.url === undefined) {
    return {
      status: 'error',
      reason: 'invalid spec',
      by: '',
    };
  }
  // eslint-disable-next-line no-restricted-syntax
  for (const ext of extensions) {
    const config = ext.configEntries;
    if (config[spec.url] !== undefined) {
      const configDemands = config[spec.url];
      const r = isNumberValuePermittedByConfig(value, configDemands, ext.name);

      if (r.status !== 'OK') {
        return r;
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

export { isNumberValuePermittedByConfig, isNumberValuePermittedByConfigs };
