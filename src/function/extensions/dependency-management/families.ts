import { Extension } from '../../../config/ucp/common';
import { normalizeFamilies } from '../../content/discovery/metadata';
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
