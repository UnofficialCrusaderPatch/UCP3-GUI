import { ExtensionsState } from '../extensions-state';
import { ExtensionDependencyTree } from './dependency-resolution';
import { createExtensionID } from '../../global/constants/extension-id';
import { ConfigFile, Extension } from '../../../config/ucp/common';
import { profileLoadOrderEntries } from '../../../config/ucp/config-files/load-order';

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
 * Packages that fully resolved among `packages` and no longer do once `removed` is
 * gone. Packages that were already unsolvable are never reported.
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

/** Installed packages, plus the active set with its pinned versions when an active package is removed. */
function inventories(state: ExtensionsState, removed: Set<string>) {
  return state.activeExtensions.some((ext) =>
    removed.has(createExtensionID(ext)),
  )
    ? [state.extensions, state.activeExtensions]
    : [state.extensions];
}

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
  // Every edge still has a candidate; a full solve can still fail (incompatible ranges).
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
    // Removing the broken packages themselves may repair the graph.
    if (!uninstallErrors(state, ids).length) return plan;
    if (initial.status !== 'ok') plan.errors = initial.messages;
    else if (pinned.status === 'error') plan.errors = pinned.messages;
    return plan;
  }
  const removing = new Set(ids);
  let changed = true;
  while (changed) {
    const previousSize = removing.size;
    // Inactive packages may use another installed version; active ones keep their pinned providers.
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

/**
 * Extension IDs a saved profile refers to, for deciding whether it must be saved
 * before `ids` are deleted. A profile without a full load order list (its
 * dependency closure isn't listed), with a sparse order that isn't a list, or
 * with an invalid entry counts as using all of `ids`.
 */
export function profileUsedExtensionIDs(config: ConfigFile, ids: string[]) {
  const full = config['config-full']?.['load-order'];
  const sparse = config['config-sparse']?.['load-order'];
  if (!Array.isArray(full) || (sparse !== undefined && !Array.isArray(sparse)))
    return new Set(ids);
  try {
    return new Set(
      profileLoadOrderEntries(config).map(
        ({ extension, version }) => `${extension}@${version}`,
      ),
    );
  } catch {
    return new Set(ids);
  }
}
