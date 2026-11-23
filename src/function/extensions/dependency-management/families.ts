import { ConfigFile, Extension, LoadOrder } from '../../../config/ucp/common';
import {
  deserializeLoadOrder,
  profileLoadOrderEntries,
} from '../../../config/ucp/config-files/load-order';
import { ExtensionDependencyTree } from './dependency-resolution';
import {
  FamilyMembership,
  normalizeFamilies,
} from '../../content/discovery/metadata';
import { ExtensionsState } from '../extensions-state';
import { createExtensionID } from '../../global/constants/extension-id';
import { saveStateChanges } from '../save-state';

type FamilyState = Pick<
  ExtensionsState,
  'activeExtensions' | 'explicitlyActivatedExtensions'
>;

const familyNames = (ext: Extension) =>
  normalizeFamilies(ext.definition?.family).map(({ name }) => name);

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
  return state.activeExtensions.filter((ext) => {
    if (explicit.has(ext.name) || appliesConfiguration(ext)) return true;
    const own = familyNames(ext);
    if (own.length === 0) return false;
    return Object.keys(ext.definition?.dependencies ?? {}).some((name) => {
      const dependency = active.get(name);
      return (
        dependency !== undefined &&
        (dependency.definition?.type ?? dependency.type) !== 'module' &&
        appliesConfiguration(dependency) &&
        !familyNames(dependency).some((family) => own.includes(family))
      );
    });
  });
}

/** Families whose chosen members (by exact version) differ between two setups that both choose one. */
export function familyMoves(before: FamilyState, after: FamilyState) {
  const choices = (state: FamilyState) => {
    const chosen = new Map<string, Set<string>>();
    familyConfigurationMembers(state).forEach((ext) =>
      familyNames(ext).forEach((family) =>
        chosen.set(
          family,
          new Set([...(chosen.get(family) ?? []), createExtensionID(ext)]),
        ),
      ),
    );
    return chosen;
  };
  const was = choices(before);
  const now = choices(after);
  return [...was].flatMap(([family, names]) => {
    const next = now.get(family);
    return next !== undefined && [...names].some((name) => !next.has(name))
      ? [family]
      : [];
  });
}

/**
 * For the first family chosen in both setups whose save-state modules change:
 * what it brings in before and after, its chosen members and their active
 * dependencies. Each family is compared on its own. Undefined when none changes.
 */
export function chosenFamilyExtensions(
  before: FamilyState,
  after: FamilyState,
) {
  const chosen = (state: FamilyState) =>
    new Set(familyConfigurationMembers(state).flatMap(familyNames));
  const inAfter = chosen(after);
  const closure = (state: FamilyState, family: string) => {
    const active = new Map(state.activeExtensions.map((e) => [e.name, e]));
    const found = new Map<string, Extension>();
    const visit = (ext: Extension) => {
      if (found.has(ext.name)) return;
      found.set(ext.name, ext);
      Object.keys(ext.definition?.dependencies ?? {}).forEach((name) => {
        const dependency = active.get(name);
        if (dependency) visit(dependency);
      });
    };
    familyConfigurationMembers(state)
      .filter((ext) => familyNames(ext).includes(family))
      .forEach(visit);
    return [...found.values()];
  };
  return [...chosen(before)]
    .filter((family) => inAfter.has(family))
    .map((family) => ({
      before: closure(before, family),
      after: closure(after, family),
    }))
    .find((pair) => {
      const { removed, added } = saveStateChanges(pair.before, pair.after);
      return removed.length + added.length > 0;
    });
}

/**
 * Choosing `ext` replaces the active members of its families. An active
 * extension outside those families that requires one of them directly blocks
 * the switch; a member may still depend on another member (Applied on Bare).
 */
export function outsideDependentsOfSiblings(
  state: FamilyState,
  ext: Extension,
) {
  const families = new Set(familyNames(ext));
  const inFamily = (other: Extension) =>
    familyNames(other).some((family) => families.has(family));
  return state.activeExtensions
    .filter((sibling) => sibling.name !== ext.name && inFamily(sibling))
    .flatMap((sibling) =>
      state.activeExtensions
        .filter(
          (dependent) =>
            !inFamily(dependent) &&
            sibling.name in (dependent.definition?.dependencies ?? {}),
        )
        .map(
          (dependent) =>
            `${familyNames(sibling).find((f) => families.has(f))}: ${dependent.name} → ${sibling.name} ↔ ${ext.name}`,
        ),
    );
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
    familyNames(ext).forEach((name) => {
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
    version?: string;
    type?: string;
    family?: unknown;
    declaredFamily?: unknown;
  };
};

const typeOf = (item: OwnershipCandidate) => item.definition.type ?? item.type;

/**
 * The root plugin owns a family ID. Another plugin is a member if the root lists
 * it in `members`, whichever root version is active. Only plugins can be
 * members. Families without exactly one root plugin name, or whose root versions
 * list different members, are ignored. Pure: returns the accepted memberships
 * per item and a warning per ignored declaration.
 */
export function acceptFamilyMemberships<T extends OwnershipCandidate>(
  items: T[],
) {
  const declared = new Map(
    items.map((item) => [item, normalizeFamilies(item.definition.family)]),
  );
  const roots = new Map<string, Set<string>>();
  const memberLists = new Map<string, Set<string>>();
  const moduleRoots = new Set<string>();
  declared.forEach((families, item) =>
    families
      .filter((f) => f.root)
      .forEach((f) => {
        if (typeOf(item) === 'module') {
          moduleRoots.add(f.name);
          return;
        }
        roots.set(
          f.name,
          new Set([...(roots.get(f.name) ?? []), item.definition.name]),
        );
        const members = [...new Set(f.members ?? [])].sort().join('\n');
        memberLists.set(
          f.name,
          new Set([...(memberLists.get(f.name) ?? []), members]),
        );
      }),
  );
  const warnings: string[] = [];
  const accepted = new Map<T, FamilyMembership[]>();
  declared.forEach((families, item) => {
    accepted.set(
      item,
      families.flatMap((membership) => {
        const ignore = (reason: string) => {
          warnings.push(
            `${item.definition.name}: family '${membership.name}' ignored, ${reason}.`,
          );
          return [];
        };
        if (typeOf(item) === 'module')
          return ignore('only plugins can be family members');
        const owners = [...(roots.get(membership.name) ?? [])];
        if (owners.length === 0)
          return ignore(
            moduleRoots.has(membership.name)
              ? 'its root is a module'
              : 'its root is not available',
          );
        if (owners.length > 1)
          return ignore(
            `several plugins claim to be its root (${owners.sort().join(', ')})`,
          );
        const lists = [...memberLists.get(membership.name)!];
        if (lists.length > 1)
          return ignore(
            `versions of its root ${owners[0]} list different members`,
          );
        if (item.definition.name === owners[0]) return [membership];
        return lists[0].split('\n').includes(item.definition.name)
          ? [{ name: membership.name }]
          : ignore(`the root ${owners[0]} does not list it as a member`);
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
  return profileLoadOrderEntries(config)
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
 * A copy of the profile without the dropped members' selections. A `promoted`
 * member becomes an explicit selection at its version: in place of an entry of
 * the same name, else before the first selection that `needs` it and after its
 * own providers (sparse orders list providers first), else at the end. The full
 * load order is dropped so the import re-resolves; saved values stay as the
 * old -> new baseline.
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
