import {
  Definition,
  DependencyStatements,
} from '../../../../config/ucp/common';
import { DependencyStatement } from '../../../../config/ucp/dependency-statement';
import { ConsoleLogger } from '../../../../util/scripts/logging';

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
  ConsoleLogger.info('parsing dependencies');
  const dependencies = definition.dependencies || definition.depends || {};

  if (dependencies instanceof Array) {
    const parsed = dependencies.map((dep) =>
      DependencyStatement.fromString(dep.toString()),
    );

    const dictionary = Object.fromEntries(
      parsed.map((ds) => [ds.extension, `${ds.operator} ${ds.version}`]),
    );

    return {
      status: 'ok',
      content: dictionary,
    } as DependenciesValidationResult;
  }
  if ((dependencies as unknown) instanceof Object) {
    return {
      status: 'ok',
      content: dependencies,
    } as DependenciesValidationResult;
  }

  return {
    status: 'error',
    messages: ['dependencies if of type string, expected Object or Array'],
  } as DependenciesValidationResult;
}
