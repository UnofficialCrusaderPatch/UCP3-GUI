import { atom } from 'jotai';
import { Dependency, Package } from 'lean-resolution';
import { DependencyTree } from '../../../../../function/extensions/dependency-management/dependency-resolution';
import { CONTENT_STORE_ATOM } from '../../state/atoms';
import { EXTENSION_STATE_INTERFACE_ATOM } from '../../../../../function/extensions/state/state';
import Logger from '../../../../../util/scripts/logging';

const LOGGER = new Logger('dependency-management.ts');

/**
 * Filters out store packages for which an extension on the local file system already exists.
 * Could be done the other way around, doesn't matter much.
 * But since dependency resolution in the Content tab (not in the Store tab) based on what is on disk,
 * It makes sense to me (gynt) to let the disk version (extensionPackages) be the authority.
 */
export const CONTENT_COLLECTION_ATOM = atom<Package[] | undefined>((get) => {
  const { data, isSuccess, error } = get(CONTENT_STORE_ATOM);

  if (!isSuccess) {
    LOGGER.msg(`No content collection atom state yet because: ${error}`).warn();
    return undefined;
  }

  const { extensions } = get(EXTENSION_STATE_INTERFACE_ATOM);

  const storePackages = data.extensions.list.map(
    (ec) =>
      new Package(
        ec.definition.name,
        ec.definition.version,
        Object.entries(ec.definition.dependencies || {}).map(
          ([ext, version]) => new Dependency(ext, version),
        ),
      ),
  );

  const extensionPackages = extensions.map(
    (e) =>
      new Package(
        e.name,
        e.version,
        Object.entries(e.definition.dependencies).map(
          ([ext, range]) => new Dependency(ext, range.raw),
        ),
      ),
  );

  const frequencies: { [id: string]: number } = {};

  storePackages.forEach((p) => {
    if (frequencies[p.id] === undefined) {
      frequencies[p.id] = 1;
    } else {
      frequencies[p.id] += 1;
    }
  });

  extensionPackages.forEach((p) => {
    if (frequencies[p.id] === undefined) {
      frequencies[p.id] = 1;
    } else {
      frequencies[p.id] += 1;
    }
  });

  const duplicates = Object.entries(frequencies)
    .filter(([, count]) => count > 1)
    .map(([id]) => id);

  return [
    ...storePackages.filter((p) => duplicates.indexOf(p.id) === -1),
    ...extensionPackages,
  ];
});

export const CONTENT_TREE_ATOM = atom((get) => {
  const obj = get(CONTENT_COLLECTION_ATOM);
  const { tree } = get(EXTENSION_STATE_INTERFACE_ATOM);
  if (obj === undefined) return undefined;
  return new DependencyTree(obj, tree.frontendVersion, tree.frameworkVersion);
});
