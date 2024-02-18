import yaml from 'yaml';
import semver from 'semver';
import { Definition } from './common';
import { UCP3SerializedDefinition } from './config-files';
import { DependencyStatement } from './dependency-statement';

// eslint-disable-next-line import/prefer-default-export
export const serializeDefinition = (definition: Definition) =>
  ({
    ...definition,
    dependencies: Object.entries(definition.dependencies).map(
      ([name, r]) => `${name} ${r.toString()}`,
    ),
  }) as UCP3SerializedDefinition;

export const deserializeDefinition = (text: string) => {
  const parsed = yaml.parseDocument(
    text,
  ) as unknown as UCP3SerializedDefinition;
  if (
    parsed.dependencies !== undefined &&
    parsed.dependencies instanceof Array
  ) {
    return {
      ...parsed,
      dependencies: Object.fromEntries(
        parsed.dependencies.map((s) => {
          const ds = DependencyStatement.fromString(s);
          return [
            ds.extension,
            new semver.Range(`${ds.operator} ${ds.version}`),
          ];
        }),
      ),
    } as Definition;
  }
  if (
    parsed.dependencies !== undefined &&
    parsed.dependencies instanceof Object
  ) {
    return {
      ...parsed,
      dependencies: Object.fromEntries(
        Object.entries(parsed.dependencies).map(([k, v]) => [
          k,
          new semver.Range(`${v}`),
        ]),
      ),
    } as Definition;
  }

  throw Error(`Cannot deserialize definition`);
};
