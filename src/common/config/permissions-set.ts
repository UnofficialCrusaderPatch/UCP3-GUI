import { ConfigEntry, OptionEntry, Configs, PermissionStatus } from './common';

function isSetValuePermittedByConfig(
  values: unknown[],
  config: ConfigEntry,
  configName: string
): PermissionStatus {
  const valueSet = new Set(values);

  const configValueDef = config.value;

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
        )}) as required by ${configName}`,
        by: configName,
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
        )}) as required by ${configName}`,
        by: configName,
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
        )}) as required by ${configName}`,
        by: configName,
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
        )}) as required by ${configName}`,
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

function isSetValuePermittedByConfigs(
  values: unknown[],
  spec: OptionEntry,
  configs: Configs
) {
  // eslint-disable-next-line no-restricted-syntax
  for (const config of configs) {
    if (config[spec.url] !== undefined) {
      const configDemands = config[spec.url];

      const r = isSetValuePermittedByConfig(
        values,
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

export { isSetValuePermittedByConfig, isSetValuePermittedByConfigs };
