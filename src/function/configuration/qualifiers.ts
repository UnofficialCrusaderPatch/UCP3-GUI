import { ConfigurationQualifier } from './state';

export function qualifierState(
  keys: string[],
  qualifiers: Record<string, ConfigurationQualifier>,
  scope: string[] = keys,
) {
  const states = new Set(
    keys.map((key) =>
      qualifiers[key] === 'required' ? 'required' : 'suggested',
    ),
  );
  if (
    states.size > 1 ||
    (states.has('required') && scope.some((key) => !keys.includes(key)))
  )
    return 'mixed';
  return states.has('required') ? 'required' : 'suggested';
}

// Select editable keys from the supplied layer: local values for the displayed
// state, effective values for whole-group actions.
export function configuredKeys(
  roots: string[],
  values: Record<string, unknown>,
  locks: Record<string, unknown>,
) {
  return Object.keys(values).filter(
    (key) =>
      values[key] !== undefined &&
      !locks[key] &&
      !key.endsWith('.menu') &&
      roots.some((root) => key === root || key.startsWith(`${root}.`)),
  );
}

export function settingRoots(node: unknown): string[] {
  if (!node || typeof node !== 'object') return [];
  const value = node as Record<string, unknown>;
  if (typeof value.url === 'string') return [value.url];
  return ['elements', 'sections', 'children'].flatMap((key) => {
    const children = value[key];
    if (!children || typeof children !== 'object') return [];
    return Object.values(children).flatMap(settingRoots);
  });
}
