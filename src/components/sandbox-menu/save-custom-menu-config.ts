import { getStore } from '../../hooks/jotai/base';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../function/configuration/state';
import {
  CONFIGURATION_DEFAULTS_REDUCER_ATOM,
  CONFIGURATION_LOCKS_REDUCER_ATOM,
} from '../../function/configuration/derived-state';
import { ConsoleLogger } from '../../util/scripts/logging';

export default function saveConfig(
  baseUrl: string,
  config: Record<string, unknown>,
) {
  // Log what was returned from the custom menu
  ConsoleLogger.debug(`sandbox-menu: saveConfig: ${baseUrl}`, config);

  // Prepend the baseUrl to the entries returned from the config menu
  const locks = getStore().get(CONFIGURATION_LOCKS_REDUCER_ATOM);
  const prependedConfig = Object.fromEntries(
    Object.entries(config)
      .filter(([subUrl]) => locks[`${baseUrl}.${subUrl}`] === undefined)
      .map(([subUrl, newConfigValue]) => [
        `${baseUrl}.${subUrl}`,
        newConfigValue,
      ]),
  );

  // Gather the keys that were set to value `undefined`
  // These keys will be cleared from the user config
  // Note they are not cleared from the baseline or defaults config
  // If that is desired, a special "none" value should be defined that the backend understands too
  const toBeCleared = Object.entries(prependedConfig)
    .filter(([, value]) => value === undefined)
    .map(([url]) => url);

  // Clear from the user config
  getStore().set(CONFIGURATION_USER_REDUCER_ATOM, {
    type: 'clear-keys',
    keys: toBeCleared,
  });

  // Gather the new user config entries that should be overridden
  // in the user config and the full config
  const userConfigEntries = Object.fromEntries(
    Object.entries(prependedConfig).filter(([, value]) => value !== undefined),
  );

  // Overwrite the values in the user config.
  getStore().set(CONFIGURATION_USER_REDUCER_ATOM, {
    type: 'set-multiple',
    value: userConfigEntries,
  });

  // Removing an override is also a change that must be applied.
  getStore().set(CONFIGURATION_TOUCHED_REDUCER_ATOM, {
    type: 'set-multiple',
    value: Object.fromEntries(
      Object.keys(prependedConfig).map((key) => [key, true]),
    ),
  });

  // Compute full config based on defaults and user values
  // TODO: currently no support for setting required/suggested
  const baseline = getStore().get(CONFIGURATION_DEFAULTS_REDUCER_ATOM);
  const urlPrefix = `${baseUrl}.`;
  const baselineEntries = Object.fromEntries(
    Object.entries(baseline).filter(([url]) => url.startsWith(urlPrefix)),
  );
  const remainingUserEntries = Object.fromEntries(
    Object.entries(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).filter(
      ([url]) => url.startsWith(urlPrefix),
    ),
  );

  // set-multiple merges, so explicitly remove stale runtime values first.
  // A cleared override then falls back to the baseline, if one exists.
  getStore().set(CONFIGURATION_FULL_REDUCER_ATOM, {
    type: 'clear-keys',
    keys: toBeCleared,
  });

  const fullConfigEntries: Record<string, unknown> = {
    ...baselineEntries,
    ...remainingUserEntries,
    ...Object.fromEntries(
      Object.entries(locks)
        .filter(([url]) => url.startsWith(urlPrefix))
        .map(([url, lock]) => [url, lock.lockedValue]),
    ),
  };

  // Update the full config
  getStore().set(CONFIGURATION_FULL_REDUCER_ATOM, {
    type: 'set-multiple',
    value: fullConfigEntries,
  });
}
