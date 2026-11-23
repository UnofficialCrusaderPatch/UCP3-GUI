import deepEqual from 'deep-equal';
import { ConfigurationLock } from './state';
import { Override } from './overrides';

export type RequiredValueRepair = {
  url: string;
  before: unknown;
  after: unknown;
  lockedBy: string;
};

/**
 * Settings that two active extensions require with different values. That is an
 * error state, so the stored preference is rewritten to neither value.
 */
export function conflictingRequirements(overrides: Map<string, Override[]>) {
  return new Set(
    [...overrides.values()]
      .flat()
      .filter(
        ({ overridden, overriding }) =>
          overridden.qualifier === 'required' &&
          overriding.qualifier === 'required' &&
          !deepEqual(overridden.value, overriding.value, { strict: true }),
      )
      .map(({ overridden }) => overridden.url),
  );
}

/** Saved preferences that differ from a required value. */
export function findRequiredValueRepairs(
  userValues: Record<string, unknown>,
  locks: Record<string, ConfigurationLock>,
  conflicting: Set<string> = new Set(),
): RequiredValueRepair[] {
  return Object.entries(locks)
    .filter(
      ([url, { lockedValue }]) =>
        !conflicting.has(url) &&
        Object.prototype.hasOwnProperty.call(userValues, url) &&
        !deepEqual(userValues[url], lockedValue, { strict: true }),
    )
    .map(([url, { lockedBy, lockedValue }]) => ({
      url,
      before: userValues[url],
      after: lockedValue,
      lockedBy,
    }))
    .sort((a, b) => a.url.localeCompare(b.url));
}

/** Store the required value, so removing the requirement later cannot revive the old preference. */
export function applyRequiredValueRepairs(
  userValues: Record<string, unknown>,
  locks: Record<string, ConfigurationLock>,
  conflicting: Set<string> = new Set(),
) {
  const repaired = { ...userValues };
  findRequiredValueRepairs(userValues, locks, conflicting).forEach(
    ({ url, after }) => {
      repaired[url] = after;
    },
  );
  return repaired;
}
