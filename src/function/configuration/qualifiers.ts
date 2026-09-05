import { ConfigurationQualifier } from './state';

export function qualifierState(
  keys: string[],
  qualifiers: Record<string, ConfigurationQualifier>,
) {
  const states = new Set(
    keys.map((key) =>
      qualifiers[key] === 'required' ? 'required' : 'suggested',
    ),
  );
  if (states.size > 1) return 'mixed';
  return states.has('required') ? 'required' : 'suggested';
}

// Groups use only explicit local values, never copy inherited defaults.
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
