import { ExtensionsState } from '../extensions-state';
import { ExtensionDependencyTree } from './dependency-resolution';
import { createExtensionID } from '../../global/constants/extension-id';
import { Extension } from '../../../config/ucp/common';

export type UninstallPlan = {
  selected: Extension[];
  dependents: Extension[];
  unused: Extension[];
  errors: string[];
};

type TreeFor = (extensions: Extension[]) => ExtensionDependencyTree;

const treeForState =
  (state: ExtensionsState): TreeFor =>
  (extensions) =>
    new ExtensionDependencyTree(
      extensions,
      state.tree.frontendVersion,
      state.tree.frameworkVersion,
    );

/**
 * Packages that resolved among `packages` but no longer resolve once `removed` is
 * gone, using the full per-package solve. Packages that were already unsolvable
 * are never reported, so a pre-existing conflict can't turn into a removal.
 * Only packages that depend (transitively, by name) on a removed name are solved.
 */
function newlyUnsolvable(
  packages: Extension[],
  removed: Set<string>,
  treeFor: TreeFor,
) {
  const affected = new Set(
    packages
      .filter((ext) => removed.has(createExtensionID(ext)))
      .map((ext) => ext.name),
  );
  if (affected.size === 0) return [];
  let size = 0;
  while (affected.size !== size) {
    size = affected.size;
    packages
      .filter(
        (ext) =>
          !affected.has(ext.name) &&
          Object.keys(ext.definition.dependencies).some((name) =>
            affected.has(name),
          ),
      )
      .forEach((ext) => affected.add(ext.name));
  }
  const remaining = packages.filter(
    (ext) => !removed.has(createExtensionID(ext)),
  );
  const candidates = remaining.filter((ext) => affected.has(ext.name));
  if (candidates.length === 0) return [];
  const before = treeFor(packages);
  const after = treeFor(remaining);
  return candidates.filter(
    (ext) =>
      before.extensionDependenciesFor(ext).status === 'OK' &&
      after.extensionDependenciesFor(ext).status !== 'OK',
  );
}

/**
 * The installed packages, where any installed version may satisfy a dependency,
 * and, when an active package is removed, the active set with its pinned versions.
 */
function inventories(state: ExtensionsState, removed: Set<string>) {
  return state.activeExtensions.some((ext) =>
    removed.has(createExtensionID(ext)),
  )
    ? [state.extensions, state.activeExtensions]
    : [state.extensions];
}

/** Use the ordinary resolver for both installed packages and pinned active versions. */
// eslint-disable-next-line import/prefer-default-export
export function uninstallErrors(state: ExtensionsState, ids: string[]) {
  const selected = new Set(ids);
  const treeFor = treeForState(state);
  const lists = inventories(state, selected);
  const edgeErrors = lists.map((packages) => {
    const solution = treeFor(
      packages.filter((ext) => !selected.has(createExtensionID(ext))),
    ).tryResolveAllDependencies();
    return solution.status !== 'ok' ? solution.messages : [];
  });
  const edgeError = edgeErrors.find((messages) => messages.length);
  if (edgeError) return edgeError;
  // Every dependency still has a candidate; also require that no package that
  // resolved before stops resolving (e.g. incompatible ranges after removal).
  const broken = new Map<string, Extension>();
  lists.forEach((packages) =>
    newlyUnsolvable(packages, selected, treeFor).forEach((ext) =>
      broken.set(createExtensionID(ext), ext),
    ),
  );
  return [...broken.keys()].map(
    (id) => `${id} would no longer resolve without ${[...selected].join(', ')}`,
  );
}

/** Preview removals through the existing resolver, including installed and pinned users. */
export function planUninstall(
  state: ExtensionsState,
  ids: string[],
  cleanUnused = false,
): UninstallPlan {
  const treeFor = treeForState(state);
  const selected = state.extensions.filter((ext) =>
    ids.includes(createExtensionID(ext)),
  );
  const plan: UninstallPlan = {
    selected,
    dependents: [],
    unused: [],
    errors: [],
  };
  if (selected.length !== new Set(ids).size) {
    plan.errors = ['content.uninstallation.changed'];
    return plan;
  }
  // Never turn an unrelated pre-existing resolution failure into a removal cascade.
  const initial = treeFor(state.extensions).tryResolveAllDependencies();
  const pinned = treeFor(state.activeExtensions).tryResolveAllDependencies();
  if (initial.status !== 'ok' || pinned.status !== 'ok') {
    // Removing the broken packages themselves may repair the graph. Do not expand
    // this special case into unrelated removals or optional cleanup.
    if (!uninstallErrors(state, ids).length) return plan;
    if (initial.status !== 'ok') plan.errors = initial.messages;
    else if (pinned.status === 'error') plan.errors = pinned.messages;
    return plan;
  }
  const removing = new Set(ids);
  let changed = true;
  while (changed) {
    const previousSize = removing.size;
    // An alternative installed version may satisfy an inactive package; an active
    // package must keep its actual pinned providers instead of silently switching.
    // Only packages that this removal breaks join the cascade.
    [state.extensions, state.activeExtensions].forEach((packages) => {
      newlyUnsolvable(packages, removing, treeFor).forEach((ext) =>
        removing.add(createExtensionID(ext)),
      );
    });
    changed = removing.size !== previousSize;
  }
  plan.dependents = state.extensions.filter(
    (ext) =>
      removing.has(createExtensionID(ext)) &&
      !ids.includes(createExtensionID(ext)),
  );
  if (cleanUnused) {
    const candidates = new Set<string>();
    [state.extensions, state.activeExtensions].forEach((packages) => {
      const tree = treeFor(packages);
      packages
        .filter((ext) => removing.has(createExtensionID(ext)))
        .forEach((ext) => {
          tree
            .extensionDependenciesFor(ext)
            .extensions?.forEach((dependency) =>
              candidates.add(createExtensionID(dependency)),
            );
        });
    });
    const explicit = new Set(
      state.explicitlyActivatedExtensions.map(createExtensionID),
    );
    changed = true;
    while (changed) {
      const previousSize = removing.size;
      state.extensions.forEach((ext) => {
        const id = createExtensionID(ext);
        if (
          candidates.has(id) &&
          !removing.has(id) &&
          !explicit.has(id) &&
          uninstallErrors(state, [...removing, id]).length === 0
        ) {
          removing.add(id);
          plan.unused.push(ext);
        }
      });
      changed = removing.size !== previousSize;
    }
  }
  plan.errors = uninstallErrors(state, [...removing]);
  return plan;
}
