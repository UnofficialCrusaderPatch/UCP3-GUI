import { ConfigFile, Extension, LoadOrder } from '../../../config/ucp/common';
import { deserializeLoadOrder } from '../../../config/ucp/config-files/load-order';
import {
  FamilyMembership,
  normalizeFamilies,
} from '../../content/discovery/metadata';
import { ExtensionsState } from '../extensions-state';

type FamilyState = Pick<
  ExtensionsState,
  'activeExtensions' | 'explicitlyActivatedExtensions'
>;

/** Dependency-only providers do not select a configuration unless they apply a preset. */
export function familyConfigurationMembers(state: FamilyState) {
  const explicit = new Set(
    state.explicitlyActivatedExtensions.map((ext) => ext.name),
  );
  return state.activeExtensions.filter(
    (ext) =>
      explicit.has(ext.name) || Object.keys(ext.configEntries ?? {}).length > 0,
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
  declared.forEach((families, item) =>
    families
      .filter((f) => f.root)
      .forEach((f) => roots.set(f.name, [...(roots.get(f.name) ?? []), item])),
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
        if (ownerNames.size === 0) return ignore('its root is not available');
        if (ownerNames.size > 1)
          return ignore(
            `several plugins claim to be its root (${[...ownerNames].sort().join(', ')})`,
          );
        if (owners.some((owner) => typeOf(owner) === 'module'))
          return ignore('its root is a module');
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
 * warnings for ignored declarations. The input is not changed.
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
            definition: { ...item.definition, family: accepted.get(item) },
          } as T),
    ),
    warnings,
  };
}

export type ProfileFamilyConflict = { family: string; members: Extension[] };

/**
 * Families for which a saved profile selects more than one configuration.
 * Uses the same claiming rule as validation: explicitly selected members and
 * active members that apply configuration demands.
 */
export function findProfileFamilyConflicts(
  config: ConfigFile,
  installed: Extension[],
): ProfileFamilyConflict[] {
  const explicitOrder = deserializeLoadOrder(
    config['config-sparse']?.['load-order'] ?? [],
  );
  const fullOrder = config['config-full']?.['load-order']
    ? deserializeLoadOrder(config['config-full']['load-order'])
    : explicitOrder;
  const resolve = ({
    extension,
    version,
  }: {
    extension: string;
    version: string;
  }) =>
    installed.find(
      (ext) => ext.name === extension && ext.version === version,
    ) ?? installed.find((ext) => ext.name === extension);
  const explicit = new Set(explicitOrder.map(({ extension }) => extension));
  const active = [...fullOrder, ...explicitOrder]
    .map(resolve)
    .filter((ext): ext is Extension => ext !== undefined);
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

/** A copy of the profile without the named extensions in either load order. The input is not changed. */
export function withoutProfileMembers(config: ConfigFile, names: string[]) {
  const drop = (order: unknown) =>
    deserializeLoadOrder(order as LoadOrder).filter(
      ({ extension }) => !names.includes(extension),
    );
  return {
    ...config,
    'config-sparse': {
      ...config['config-sparse'],
      'load-order': drop(config['config-sparse']['load-order'] ?? []),
    },
    ...(config['config-full']
      ? {
          'config-full': {
            ...config['config-full'],
            'load-order': drop(config['config-full']['load-order'] ?? []),
          },
        }
      : {}),
  } as ConfigFile;
}
