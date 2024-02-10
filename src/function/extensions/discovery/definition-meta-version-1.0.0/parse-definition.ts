import * as semver from 'semver';

import {
  Definition,
  DependencyStatements,
} from '../../../../config/ucp/common';
import { DependencyStatement } from '../../../../config/ucp/dependency-statement';

// eslint-disable-next-line @typescript-eslint/naming-convention
export type DefinitionMeta_1_0_0 = Definition & {
  depends: string[];
} & {
  dependencies: string[];
};

export type DependenciesValidationResult =
  | {
      status: 'ok';
      content: DependencyStatements;
    }
  | {
      status: 'error';
      messages: string[];
    };

// eslint-disable-next-line import/prefer-default-export
export function parseDependencies(
  definition: DefinitionMeta_1_0_0,
): DependenciesValidationResult {
  const dependencies = definition.dependencies || definition.depends || {};

  if (dependencies instanceof Array) {
    const parsed = dependencies.map((dep) =>
      DependencyStatement.fromString(dep.toString()),
    );

    const dictionary = Object.fromEntries(
      parsed.map((ds) => [
        ds.extension,
        new semver.Range(`${ds.operator} ${ds.version}`, { loose: true }),
      ]),
    );

    return {
      status: 'ok',
      content: dictionary,
    } as DependenciesValidationResult;
  }
  if ((dependencies as unknown) instanceof Object) {
    return {
      status: 'ok',
      content: Object.fromEntries(
        Object.entries(dependencies).map(([name, range]) => [
          name,
          new semver.Range(`${range}`, { loose: true }),
        ]),
      ),
    } as DependenciesValidationResult;
  }

  return {
    status: 'error',
    messages: ['dependencies if of type string, expected Object or Array'],
  } as DependenciesValidationResult;
}
