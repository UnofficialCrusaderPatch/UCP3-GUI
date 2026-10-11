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

/** Use the ordinary resolver for both installed packages and pinned active versions. */
// eslint-disable-next-line import/prefer-default-export
export function uninstallErrors(state: ExtensionsState, ids: string[]) {
  const selected = new Set(ids);
  const remaining = state.extensions.filter(
    (ext) => !selected.has(createExtensionID(ext)),
  );
  const candidates = [remaining];
  if (
    state.activeExtensions.some((ext) => selected.has(createExtensionID(ext)))
  ) {
    candidates.push(
      state.activeExtensions.filter(
        (ext) => !selected.has(createExtensionID(ext)),
      ),
    );
  }
  const errors = candidates.map((extensions) => {
    const tree = new ExtensionDependencyTree(
      extensions,
      state.tree.frontendVersion,
      state.tree.frameworkVersion,
    );
    const solution = tree.tryResolveAllDependencies();
    return solution.status !== 'ok' ? solution.messages : [];
  });
  return errors.find((messages) => messages.length) ?? [];
}

/** Preview removals through the existing resolver, including installed and pinned users. */
export function planUninstall(
  state: ExtensionsState,
  ids: string[],
  cleanUnused = false,
): UninstallPlan {
  const treeFor = (extensions: Extension[]) =>
    new ExtensionDependencyTree(
      extensions,
      state.tree.frontendVersion,
      state.tree.frameworkVersion,
    );
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
    [state.extensions, state.activeExtensions].forEach((packages) => {
      const remaining = packages.filter(
        (ext) => !removing.has(createExtensionID(ext)),
      );
      const tree = treeFor(remaining);
      remaining.forEach((ext) => {
        if (tree.extensionDependenciesFor(ext).status !== 'OK') {
          removing.add(createExtensionID(ext));
        }
      });
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
