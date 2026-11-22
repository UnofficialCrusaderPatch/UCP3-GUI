import deepEqual from 'deep-equal';
import { ConfigurationLock } from './state';

export type RequiredValueRepair = {
  url: string;
  before: unknown;
  after: unknown;
  lockedBy: string;
};

/**
 * Saved preferences that a required extension value overrides.
 * A preference that already equals the required value needs no repair.
 */
export function findRequiredValueRepairs(
  userValues: Record<string, unknown>,
  locks: Record<string, ConfigurationLock>,
): RequiredValueRepair[] {
  return Object.entries(locks)
    .filter(
      ([url, { lockedValue }]) =>
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
) {
  const repaired = { ...userValues };
  findRequiredValueRepairs(userValues, locks).forEach(({ url, after }) => {
    repaired[url] = after;
  });
  return repaired;
}
