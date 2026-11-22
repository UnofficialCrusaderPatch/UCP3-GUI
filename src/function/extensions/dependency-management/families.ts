import { ConfigFile, Extension, LoadOrder } from '../../../config/ucp/common';
import { deserializeLoadOrder } from '../../../config/ucp/config-files/load-order';
import { ExtensionDependencyTree } from './dependency-resolution';
import {
  FamilyMembership,
  normalizeFamilies,
} from '../../content/discovery/metadata';
import { ExtensionsState } from '../extensions-state';

type FamilyState = Pick<
  ExtensionsState,
  'activeExtensions' | 'explicitlyActivatedExtensions'
>;

const appliesConfiguration = (ext: Extension) =>
  Object.keys(ext.configEntries ?? {}).length > 0;

/**
 * Dependency-only providers do not select a configuration unless they apply a
 * preset: their own configuration demands, or those of a plugin they depend on
 * directly that is outside their families (a wrapper member such as "Basics +
 * Fixes" that brings in a separate fixes preset). Modules never count, so a
 * files-only Bare member that depends on a module stays a plain provider.
 */
export function familyConfigurationMembers(state: FamilyState) {
  const explicit = new Set(
    state.explicitlyActivatedExtensions.map((ext) => ext.name),
  );
  const active = new Map(state.activeExtensions.map((ext) => [ext.name, ext]));
  const familiesOf = (ext: Extension) =>
    normalizeFamilies(ext.definition?.family).map(({ name }) => name);
  return state.activeExtensions.filter((ext) => {
    if (explicit.has(ext.name) || appliesConfiguration(ext)) return true;
    const own = familiesOf(ext);
    if (own.length === 0) return false;
    return Object.keys(ext.definition?.dependencies ?? {}).some((name) => {
      const dependency = active.get(name);
      return (
        dependency !== undefined &&
        (dependency.definition?.type ?? dependency.type) !== 'module' &&
        appliesConfiguration(dependency) &&
        !familiesOf(dependency).some((family) => own.includes(family))
      );
    });
  });
}

export class FamilyConflictError extends Error {
  constructor(public details: string) {
    super(details);
    this.name = 'FamilyConflictError';
  }
}

/** Validate resolved choices, including presets required indirectly by other extensions. */
export function assertFamilyChoices(state: FamilyState) {
  const choices = new Map<string, Extension[]>();
  familyConfigurationMembers(state).forEach((ext) => {
    normalizeFamilies(ext.definition?.family).forEach(({ name }) => {
      const members = choices.get(name) ?? [];
      if (!members.some((member) => member.name === ext.name))
        members.push(ext);
      choices.set(name, members);
    });
  });
  const conflicts = [...choices].filter(([, members]) => members.length > 1);
  if (!conflicts.length) return;

  // These are paths through the already resolved extensions, not another resolver.
  const pathTo = (target: Extension) => {
    const paths = state.explicitlyActivatedExtensions.map((ext) => [ext]);
    const visited = new Set<string>();
    while (paths.length) {
      const path = paths.shift()!;
      const ext = path[path.length - 1];
      if (ext.name === target.name) return path.map((e) => e.name).join(' → ');
      if (!visited.has(ext.name)) {
        visited.add(ext.name);
        state.activeExtensions
          .filter((member) => member.name in ext.definition.dependencies)
          .forEach((member) => paths.push([...path, member]));
      }
    }
    return target.name;
  };
  throw new FamilyConflictError(
    conflicts
      .map(
        ([family, members]) => `${family}: ${members.map(pathTo).join(' ↔ ')}`,
      )
      .join('\n'),
  );
}

type OwnershipCandidate = {
  type?: string;
  definition: {
    name: string;
    author?: unknown;
    type?: string;
    family?: unknown;
    declaredFamily?: unknown;
  };
};

const authorOf = (item: OwnershipCandidate) =>
  typeof item.definition.author === 'string'
    ? item.definition.author.trim().toLowerCase()
    : '';
const typeOf = (item: OwnershipCandidate) => item.definition.type ?? item.type;

/**
 * The root plugin owns a family ID. Only plugins can be members. Another plugin
 * belongs to the family only if the root lists it in `members` or has the same
 * author; any other self-declared membership is ignored, so no third party can
 * make someone else's packages mutually exclusive. Families without exactly one
 * root plugin name among `items` are ignored. Pure: returns the accepted
 * memberships per item and a warning per ignored declaration.
 */
export function acceptFamilyMemberships<T extends OwnershipCandidate>(
  items: T[],
) {
  const declared = new Map(
    items.map((item) => [item, normalizeFamilies(item.definition.family)]),
  );
  const roots = new Map<string, T[]>();
  const moduleRoots = new Set<string>();
  declared.forEach((families, item) =>
    families
      .filter((f) => f.root)
      .forEach((f) => {
        if (typeOf(item) === 'module') moduleRoots.add(f.name);
        else roots.set(f.name, [...(roots.get(f.name) ?? []), item]);
      }),
  );
  const warnings: string[] = [];
  const accepted = new Map<T, FamilyMembership[]>();
  declared.forEach((families, item) => {
    accepted.set(
      item,
      families.filter((membership) => {
        const ignore = (reason: string) => {
          warnings.push(
            `${item.definition.name}: family '${membership.name}' ignored, ${reason}.`,
          );
          return false;
        };
        if (typeOf(item) === 'module')
          return ignore('only plugins can be family members');
        const owners = roots.get(membership.name) ?? [];
        const ownerNames = new Set(
          owners.map((owner) => owner.definition.name),
        );
        if (ownerNames.size === 0)
          return ignore(
            moduleRoots.has(membership.name)
              ? 'its root is a module'
              : 'its root is not available',
          );
        if (ownerNames.size > 1)
          return ignore(
            `several plugins claim to be its root (${[...ownerNames].sort().join(', ')})`,
          );
        if (ownerNames.has(item.definition.name)) return true;
        const acceptedByRoot = owners.some(
          (owner) =>
            declared
              .get(owner)!
              .find((f) => f.name === membership.name)
              ?.members?.includes(item.definition.name) ||
            (authorOf(owner) !== '' && authorOf(owner) === authorOf(item)),
        );
        return (
          acceptedByRoot ||
          ignore(
            `the root ${[...ownerNames][0]} neither lists it as a member nor has the same author`,
          )
        );
      }),
    );
  });
  return { accepted, warnings };
}

/**
 * Copies whose `family` holds only memberships their root accepts, plus the
 * warnings for ignored declarations. `declaredFamily` keeps what was authored.
 * The input is not changed.
 */
export function withAcceptedFamilies<T extends OwnershipCandidate>(
  items: T[],
): { items: T[]; warnings: string[] } {
  const { accepted, warnings } = acceptFamilyMemberships(items);
  return {
    items: items.map((item) =>
      item.definition.family === undefined
        ? item
        : ({
            ...item,
            definition: {
              ...item.definition,
              family: accepted.get(item),
              declaredFamily: item.definition.family,
            },
          } as T),
    ),
    warnings,
  };
}

export type ProfileFamilyConflict = { family: string; members: Extension[] };

/**
 * The extensions a saved profile makes active, by exact version: its full load
 * order, or for a profile saved without one, its explicit selections plus their
 * dependency closure as the sparse import resolves it. Entries whose exact
 * version isn't installed are left out; the import reports them.
 */
export function profileActiveExtensions(
  config: ConfigFile,
  installed: Extension[],
  tree?: ExtensionDependencyTree,
) {
  const exact = ({
    extension,
    version,
  }: {
    extension: string;
    version: string;
  }) =>
    installed.find((ext) => ext.name === extension && ext.version === version);
  const listed = (order: unknown) =>
    deserializeLoadOrder((order ?? []) as LoadOrder)
      .map(exact)
      .filter((ext): ext is Extension => ext !== undefined);
  const explicit = listed(config['config-sparse']?.['load-order']);
  const fullOrder = config['config-full']?.['load-order'];
  // The importer falls back to resolving the explicit selections when an exact
  // version of the saved full order isn't installed; mirror that here.
  const fullEntries =
    fullOrder !== undefined ? deserializeLoadOrder(fullOrder as LoadOrder) : [];
  const full =
    fullEntries.length > 0 &&
    fullEntries.every((entry) => exact(entry) !== undefined)
      ? fullOrder
      : undefined;
  let closure: Extension[] = full ? listed(full) : [];
  if (!full && tree) {
    try {
      const solution = tree.copy().extensionDependenciesForExtensions(explicit);
      if (solution.status === 'OK') closure = solution.extensions ?? [];
    } catch {
      closure = [];
    }
  }
  return [...new Set([...closure, ...explicit])];
}

/** Installed extensions a saved profile lists by exact version, in either load order. */
export function profileListedExtensions(
  config: ConfigFile,
  installed: Extension[],
) {
  return [
    config['config-full']?.['load-order'],
    config['config-sparse']?.['load-order'],
  ]
    .flatMap((order) => deserializeLoadOrder((order ?? []) as LoadOrder))
    .map(({ extension, version }) =>
      installed.find(
        (ext) => ext.name === extension && ext.version === version,
      ),
    )
    .filter((ext): ext is Extension => ext !== undefined);
}

/**
 * Families for which a saved profile selects more than one configuration.
 * Uses the same claiming rule as validation: explicitly selected members and
 * active members that apply configuration demands.
 */
export function findProfileFamilyConflicts(
  config: ConfigFile,
  installed: Extension[],
  tree?: ExtensionDependencyTree,
): ProfileFamilyConflict[] {
  const explicit = new Set(
    deserializeLoadOrder(
      (config['config-sparse']?.['load-order'] ?? []) as LoadOrder,
    ).map(({ extension }) => extension),
  );
  const active = profileActiveExtensions(config, installed, tree);
  const choices = new Map<string, Extension[]>();
  familyConfigurationMembers({
    activeExtensions: active,
    explicitlyActivatedExtensions: active.filter((ext) =>
      explicit.has(ext.name),
    ),
  }).forEach((ext) =>
    normalizeFamilies(ext.definition.family).forEach(({ name }) => {
      const members = choices.get(name) ?? [];
      if (!members.some((member) => member.name === ext.name))
        members.push(ext);
      choices.set(name, members);
    }),
  );
  return [...choices]
    .filter(([, members]) => members.length > 1)
    .map(([family, members]) => ({ family, members }))
    .sort((a, b) => a.family.localeCompare(b.family));
}

type LoadOrderEntry = { extension: string; version: string };

/**
 * A copy of the profile for a family choice: the dropped members leave the
 * explicit selections, and `promoted` members (kept choices the remaining
 * selections don't bring in at the chosen version) become explicit selections
 * at that version. An explicit entry of the same name gets the chosen version
 * in place. Otherwise the member goes just before the first remaining selection
 * that `needs` it (the sparse load order lists providers first), but after its
 * own explicit providers; without a consumer it goes at the end. The saved full
 * load order is dropped, so the import re-resolves the dependency closure from
 * the kept selections; the saved values stay as the baseline for the old -> new
 * warning. The input is not changed.
 */
export function withoutProfileMembers(
  config: ConfigFile,
  names: string[],
  promoted: Extension[] = [],
  needs: (entry: LoadOrderEntry, member: Extension) => boolean = () => false,
) {
  const order: LoadOrderEntry[] = deserializeLoadOrder(
    (config['config-sparse']['load-order'] ?? []) as LoadOrder,
  ).filter(({ extension }) => !names.includes(extension));
  promoted.forEach((member) => {
    const entry = { extension: member.name, version: member.version };
    const same = order.findIndex(({ extension }) => extension === member.name);
    if (same >= 0) {
      order[same] = entry;
      return;
    }
    const consumer = order.findIndex((selection) => needs(selection, member));
    const ownProviders = order
      .map(({ extension }, index) =>
        member.definition?.dependencies?.[extension] !== undefined ? index : -1,
      )
      .filter((index) => index >= 0);
    const at = Math.max(
      consumer < 0 ? order.length : consumer,
      ownProviders.length > 0 ? Math.max(...ownProviders) + 1 : 0,
    );
    order.splice(at, 0, entry);
  });
  const full = config['config-full'];
  const fullValues = full
    ? (Object.fromEntries(
        Object.entries(full).filter(([key]) => key !== 'load-order'),
      ) as typeof full)
    : undefined;
  return {
    ...config,
    'config-sparse': { ...config['config-sparse'], 'load-order': order },
    ...(fullValues ? { 'config-full': fullValues } : {}),
  } as ConfigFile;
}
