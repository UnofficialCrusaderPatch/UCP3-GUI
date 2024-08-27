import yaml from 'yaml';
import { Extension, LoadOrder } from '../common';
import { DependencyStatement } from '../dependency-statement';

export function serializeLoadOrder(extensions: Extension[]) {
  return extensions.map((ext) => ({
    extension: ext.name,
    version: `${ext.version}`,
  }));
}

export function serializeLoadOrderToYaml(extensions: Extension[]) {
  return yaml.stringify(serializeLoadOrder(extensions));
}

export function deserializeLoadOrder(values: string[] | LoadOrder) {
  const result: LoadOrder = [];

  if (!(values instanceof Array))
    throw Error(`Illegal load-order spec ${JSON.stringify(values)}`);

  if (values.length === 0) return result;

  const isObject = values[0] instanceof Object;

  if (isObject) {
    return values as LoadOrder;
  }
  const converted = values as string[];
  converted.forEach((val) => {
    if (Object.keys(val).length !== 1)
      throw Error(`Illegal load-order spec ${JSON.stringify(values)}`);

    const ds = DependencyStatement.fromString(val);
    const name = ds.extension;
    const { version } = ds;

    if (ds.operator !== '==')
      throw Error(`Illegal load-order spec ${JSON.stringify(values)}`);

    result.push({ extension: name, version: version.toString() });
  });

  return result;
}

export function deserializeLoadOrderFromYaml(value: string) {
  return deserializeLoadOrder(yaml.parse(value));
}
