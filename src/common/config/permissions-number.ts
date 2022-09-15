import { ConfigEntry, OptionEntry, Configs, PermissionStatus } from './common';

function isNumberValuePermittedByConfig(
  value: number,
  config: ConfigEntry,
  configName: string
): PermissionStatus {
  const configValueDef = config.value;
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

  return {
    status: 'OK',
    reason: '',
    by: '',
  };
}

function isNumberValuePermittedByConfigs(
  value: number,
  spec: OptionEntry,
  configs: Configs
): PermissionStatus {
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
      const r = isNumberValuePermittedByConfig(
        value,
        configDemands,
        'not implemented'
      );

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
