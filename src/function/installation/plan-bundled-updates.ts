import { Dependency, Package } from 'lean-resolution';
import { prerelease, rcompare, satisfies } from 'semver';
import { Extension } from '../../config/ucp/common';
import { ContentStore } from '../content/store/fetch';
import { ContentElement } from '../content/types/content-element';
import { DependencyTree } from '../extensions/dependency-management/dependency-resolution';

// Resolve one coherent set, including dependencies, rather than upgrading each
// bundled package independently. Keep local definitions authoritative.
// eslint-disable-next-line import/prefer-default-export
export function planBundledUpdates(
  bundled: Extension[],
  store: ContentStore,
  frontend: string,
  framework: string,
): ContentElement[] {
  if (
    !satisfies(framework, store.framework.version) ||
    !satisfies(frontend, store.frontend.version)
  ) {
    throw new Error('Store is incompatible with this installation');
  }
  const localIDs = new Set(bundled.map((e) => `${e.name}@${e.version}`));
  const online = store.extensions.list.filter(
    (e) =>
      !localIDs.has(`${e.definition.name}@${e.definition.version}`) &&
      prerelease(e.definition.version) === null &&
      /^[a-zA-Z0-9_-]+$/.test(e.definition.name) &&
      e.contents.package.some(
        (p) =>
          p.method === 'github-binary' &&
          (e.definition.type !== 'module' ||
            ('signature' in p && !!p.signature)),
      ),
  );
  const packages = [
    ...online.map(
      (e) =>
        new Package(
          e.definition.name,
          e.definition.version,
          Object.entries(e.definition.dependencies || {}).map(
            ([n, v]) => new Dependency(n, v),
          ),
        ),
    ),
    ...bundled.map(
      (e) =>
        new Package(
          e.name,
          e.version,
          Object.entries(e.definition.dependencies).map(
            ([n, v]) => new Dependency(n, v.raw),
          ),
        ),
    ),
  ];
  const newestBundled = [...bundled].sort((a, b) =>
    rcompare(a.version, b.version),
  );
  const roots = [...new Set(newestBundled.map((e) => e.name))].map(
    (name) =>
      new Dependency(
        name,
        `>=${newestBundled.find((e) => e.name === name)!.version}`,
      ),
  );
  const request = new Package('__bundled_updates__', '1.0.0', roots);
  const tree = new DependencyTree([...packages, request], frontend, framework);
  const solution = tree.dependenciesFor(request.id);
  if (solution.status !== 'OK') throw new Error(solution.message);
  const ids = new Set(solution.packages.map((p) => p.id));
  return online
    .filter((e) => ids.has(`${e.definition.name}@${e.definition.version}`))
    .map((e) => ({ ...e, installed: false, online: true }));
}
