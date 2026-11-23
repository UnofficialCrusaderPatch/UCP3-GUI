import { Dependency, Package } from 'lean-resolution';
import { prerelease, rcompare, satisfies } from 'semver';
import { Extension } from '../../config/ucp/common';
import { ContentStore } from '../content/store/fetch';
import { ContentElement } from '../content/types/content-element';
import { DependencyTree } from '../extensions/dependency-management/dependency-resolution';

// Names of the synthetic request packages for planning and for validating the
// installed result. Store packages with these names are ignored; installed or
// bundled packages with them are rejected before the resolver runs.
const BUNDLED_REQUEST = '__bundled_updates__';
export const INSTALLED_REQUEST = '__installed_updates__';
const RESERVED_NAMES = new Set([BUNDLED_REQUEST, INSTALLED_REQUEST]);

export function rejectReservedNames(names: string[]) {
  const reserved = names.filter((n) => RESERVED_NAMES.has(n));
  if (reserved.length > 0) {
    throw new Error(`Reserved package name: ${reserved.join(', ')}`);
  }
}

// Upper bound on the resolver's work for a request, computed without running
// it: every package reached, with all its edges, counted once per path from the
// request, each edge pointing at its newest satisfying package (frontend and
// framework included). Infinity on a cycle. Resolver time grows faster than
// this count, so a plan over the budget is rejected before any solve.
export const MAX_TRAVERSAL_WORK = 25000;
export function traversalWork(request: Package, repository: Package[]) {
  const targets = new Map<Dependency, Package | undefined>();
  const targetOf = (d: Dependency) => {
    if (!targets.has(d)) targets.set(d, d.maxSatisfyingPackage(repository));
    return targets.get(d);
  };
  const acyclic = new Map<Package, boolean>(); // false while still on the path
  const order: Package[] = [];
  const visit = (p: Package): boolean => {
    if (acyclic.has(p)) return acyclic.get(p)!;
    acyclic.set(p, false);
    const ok = p.dependencies.every((d) => {
      const t = targetOf(d);
      return t === undefined || visit(t);
    });
    acyclic.set(p, ok);
    order.push(p);
    return ok;
  };
  if (!visit(request)) return Infinity;

  // Dependents come before their dependencies in reverse depth-first order
  const visits = new Map(order.map((p) => [p, p === request ? 1 : 0]));
  order.reverse().forEach((p) =>
    p.dependencies.forEach((d) => {
      const t = targetOf(d);
      if (t !== undefined) visits.set(t, visits.get(t)! + visits.get(p)!);
    }),
  );
  return order.reduce(
    (work, p) => work + visits.get(p)! * (1 + p.dependencies.length),
    0,
  );
}

const ROUNDS_PER_NAME = 4;

// Constraints met, and a small acyclic traversal for the final validation
function isSafeSelection(chosen: Package[], platform: Map<string, string>) {
  const byName = new Map(chosen.map((p) => [p.name, p]));
  const satisfied = chosen.every((p) =>
    p.dependencies.every((d) =>
      platform.has(d.name)
        ? satisfies(platform.get(d.name)!, d.versionRange.range)
        : byName.has(d.name) && d.isSatisfiedBy(byName.get(d.name)!),
    ),
  );
  if (!satisfied) return false;
  const request = new Package(
    BUNDLED_REQUEST,
    '1.0.0',
    chosen.map((p) => new Dependency(p.name, `=${p.version.raw}`)),
  );
  const repository = [
    ...chosen,
    ...[...platform].map(([name, version]) => new Package(name, version)),
    request,
  ];
  return traversalWork(request, repository) <= MAX_TRAVERSAL_WORK;
}

// Choose the setup's packages without a backtracking search, keeping the
// bundled plan pinned: each name gets the newest admissible release that fits
// the current choice, repeated to a fixed point. This may skip a setup that a
// full solver could satisfy. Returns one package per name, or undefined.
function selectSetup(
  setup: string,
  pins: Map<string, Package>,
  store: Package[],
  platform: Map<string, string>,
) {
  const releases = new Map<string, Package[]>();
  store
    .filter((p) => !pins.has(p.name))
    .forEach((p) => releases.set(p.name, [...(releases.get(p.name) ?? []), p]));
  releases.forEach((list) =>
    list.sort((a, b) => rcompare(a.version, b.version)),
  );
  const admissible = (c: Package) =>
    c.dependencies.every((d) => {
      if (platform.has(d.name)) {
        return satisfies(platform.get(d.name)!, d.versionRange.range);
      }
      if (pins.has(d.name)) return d.isSatisfiedBy(pins.get(d.name)!);
      return releases.has(d.name);
    });
  const root = new Dependency(setup, '*');

  // One round: constraints from the current choice, newest admissible fit
  const next = (current: Map<string, Package>) => {
    const constraints = new Map<string, Dependency[]>([[setup, [root]]]);
    current.forEach((p) =>
      p.dependencies
        .filter((d) => !platform.has(d.name) && !pins.has(d.name))
        .forEach((d) =>
          constraints.set(d.name, [...(constraints.get(d.name) ?? []), d]),
        ),
    );
    const chosen = new Map<string, Package>();
    const complete = [...constraints].every(([name, ds]) => {
      const fit = (releases.get(name) ?? []).find(
        (c) => admissible(c) && ds.every((d) => d.isSatisfiedBy(c)),
      );
      if (fit !== undefined) chosen.set(name, fit);
      return fit !== undefined;
    });
    return complete ? chosen : undefined;
  };
  const same = (a: Map<string, Package>, b: Map<string, Package>) =>
    a.size === b.size && [...a].every(([name, p]) => b.get(name) === p);

  let selected = new Map<string, Package>();
  for (
    let round = 0;
    round < ROUNDS_PER_NAME * (releases.size + 1);
    round += 1
  ) {
    const chosen = next(selected);
    if (chosen === undefined) return undefined;
    if (same(chosen, selected)) {
      const all = [...pins.values(), ...chosen.values()];
      return isSafeSelection(all, platform) ? all : undefined;
    }
    selected = chosen;
  }
  return undefined;
}

// Resolve one coherent set, including dependencies, rather than upgrading each
// bundled package independently. Keep local definitions authoritative.
// An optional setup package is added on top when it fits that set.
// eslint-disable-next-line import/prefer-default-export
export function planBundledUpdates(
  bundled: Extension[],
  store: ContentStore,
  frontend: string,
  framework: string,
  setup?: string,
): ContentElement[] {
  if (
    !satisfies(framework, store.framework.version) ||
    !satisfies(frontend, store.frontend.version)
  ) {
    throw new Error('Store is incompatible with this installation');
  }
  rejectReservedNames(bundled.map((e) => e.name));
  const localIDs = new Set(bundled.map((e) => `${e.name}@${e.version}`));
  // Bind eligibility to the exact source the installer will consume. In
  // particular, an unsigned mirror must not shadow a later signed module.
  const online = store.extensions.list
    .map((e) => ({
      ...e,
      contents: {
        ...e.contents,
        package: e.contents.package
          .filter(
            (p) =>
              p.method === 'github-binary' &&
              (e.definition.type !== 'module' ||
                ('signature' in p && !!p.signature)),
          )
          .slice(0, 1),
      },
    }))
    .filter(
      (e) =>
        !localIDs.has(`${e.definition.name}@${e.definition.version}`) &&
        prerelease(e.definition.version) === null &&
        /^[a-zA-Z0-9_-]+$/.test(e.definition.name) &&
        !RESERVED_NAMES.has(e.definition.name) &&
        e.contents.package.length === 1,
    );
  const onlinePackages = online.map(
    (e) =>
      new Package(
        e.definition.name,
        e.definition.version,
        Object.entries(e.definition.dependencies || {}).map(
          ([n, v]) => new Dependency(n, v),
        ),
      ),
  );
  const packages = [
    ...onlinePackages,
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
  const solve = (repository: Package[], dependencies: Dependency[]) => {
    const request = new Package(BUNDLED_REQUEST, '1.0.0', dependencies);
    const tree = new DependencyTree(
      [...repository, request],
      frontend,
      framework,
    );
    return tree.dependenciesFor(request.id);
  };
  let solution = solve(packages, roots);
  if (solution.status !== 'OK') throw new Error(solution.message);
  // The optional setup joins the plan only if it fits the bundled updates
  // chosen above; it never changes them.
  if (
    setup !== undefined &&
    !roots.some((r) => r.name === setup) &&
    online.some((e) => e.definition.name === setup)
  ) {
    const pins = new Map(
      solution.packages
        .filter((p) => p.name !== BUNDLED_REQUEST)
        .map((p): [string, Package] => [p.name, p]),
    );
    const chosen = selectSetup(
      setup,
      pins,
      onlinePackages,
      new Map([
        ['frontend', frontend],
        ['framework', framework],
      ]),
    );
    if (chosen !== undefined) {
      const validated = solve(
        chosen,
        chosen.map((p) => new Dependency(p.name, `=${p.version.raw}`)),
      );
      if (validated.status === 'OK') solution = validated;
    }
  }
  const ids = new Set(solution.packages.map((p) => p.id));
  return online
    .filter((e) => ids.has(`${e.definition.name}@${e.definition.version}`))
    .map((e) => ({ ...e, installed: false, online: true }));
}
