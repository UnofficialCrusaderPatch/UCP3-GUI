import { ExtensionsState } from '../extensions-state';
import { ExtensionDependencyTree } from './dependency-resolution';
import { createExtensionID } from '../../global/constants/extension-id';

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
