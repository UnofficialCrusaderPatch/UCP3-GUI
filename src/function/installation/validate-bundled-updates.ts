import { Dependency, Package } from 'lean-resolution';
import { Range, rcompare } from 'semver';
import { Extension } from '../../config/ucp/common';
import { ContentElement } from '../content/types/content-element';
import { DependencyTree } from '../extensions/dependency-management/dependency-resolution';
import {
  INSTALLED_REQUEST,
  MAX_TRAVERSAL_WORK,
  rejectReservedNames,
  traversalWork,
} from './plan-bundled-updates';

// Validate what discovery actually loaded, rather than trusting catalog metadata
// or successful ZIP extraction. Candidates must exclude bundles about to be pruned.
// eslint-disable-next-line import/prefer-default-export
export function validateBundledUpdates(
  bundled: Extension[],
  candidates: Extension[],
  plan: ContentElement[],
  frontend: string,
  framework: string,
) {
  rejectReservedNames(candidates.map((e) => e.name));
  plan.forEach(({ definition: expected }) => {
    const actual = candidates.find(
      (e) =>
        e.name === expected.name &&
        e.version === expected.version &&
        e.type === expected.type,
    );
    if (!actual) {
      throw new Error(
        `Installed replacement is missing or invalid: ${expected.name}@${expected.version}`,
      );
    }
    const expectedDependencies = Object.entries(expected.dependencies || {})
      .map(([name, range]) => [name, new Range(range, { loose: true }).range])
      .sort();
    const actualDependencies = Object.entries(actual.definition.dependencies)
      .map(([name, range]) => [name, range.range])
      .sort();
    if (
      JSON.stringify(expectedDependencies) !==
      JSON.stringify(actualDependencies)
    ) {
      throw new Error(
        `Installed dependencies differ from the Store: ${expected.name}@${expected.version}`,
      );
    }
  });

  const roots = new Map<string, string>();
  [...bundled]
    .sort((a, b) => rcompare(a.version, b.version))
    .forEach((e) => {
      if (!roots.has(e.name)) roots.set(e.name, `>=${e.version}`);
    });
  plan.forEach(({ definition: d }) => roots.set(d.name, `=${d.version}`));
  const request = new Package(
    INSTALLED_REQUEST,
    '1.0.0',
    [...roots].map(([name, range]) => new Dependency(name, range)),
  );
  const packages = candidates.map(
    (e) =>
      new Package(
        e.name,
        e.version,
        Object.entries(e.definition.dependencies).map(
          ([name, range]) => new Dependency(name, range.raw),
        ),
      ),
  );
  // Bound the solve before it runs (see traversalWork)
  const work = traversalWork(request, [
    ...packages,
    new Package('frontend', frontend),
    new Package('framework', framework),
    request,
  ]);
  if (work > MAX_TRAVERSAL_WORK) {
    throw new Error('Installed updates are cyclic or too large to validate');
  }
  const tree = new DependencyTree([...packages, request], frontend, framework);
  const solution = tree.dependenciesFor(request.id);
  if (solution.status !== 'OK') {
    throw new Error(`Installed updates are incompatible: ${solution.message}`);
  }
}
