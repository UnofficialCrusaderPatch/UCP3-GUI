import { createStore } from 'jotai';
import { afterEach, describe, expect, test } from 'vitest';
import { LaunchSettings } from '../../../../function/gui-settings/LaunchSettings';
import {
  allowMultipleInstancesArgs,
  LAUNCH_OPTION_ALLOW_MULTIPLE_INSTANCES_ATOM,
} from './option-allow-multiple-instances';

// Launch settings as saved by a GUI version without this option
const OLDER_SETTINGS: LaunchSettings = {
  gameDataPath: 'C:/data',
  view: true,
  console: { show: true },
  customEnvVariables: {},
  customLaunchArguments: '--foo',
  logLevel: { file: 'DEFAULT', console: 'DEFAULT' },
  security: false,
};

// Reading the stored value needs a mounted (subscribed) atom
function mountedStore() {
  const store = createStore();
  store.sub(LAUNCH_OPTION_ALLOW_MULTIPLE_INSTANCES_ATOM, () => {});
  return store;
}

afterEach(() => localStorage.clear());

describe('allow multiple instances launch option', () => {
  test.each([
    ['no saved settings', undefined],
    ['settings saved before the option existed', OLDER_SETTINGS],
  ])('is off with %s', (_, stored) => {
    if (stored) localStorage.setItem('launch.options', JSON.stringify(stored));
    expect(
      mountedStore().get(LAUNCH_OPTION_ALLOW_MULTIPLE_INSTANCES_ATOM),
    ).toBe(false);
  });

  test('is saved without changing other launch options', () => {
    localStorage.setItem('launch.options', JSON.stringify(OLDER_SETTINGS));
    mountedStore().set(LAUNCH_OPTION_ALLOW_MULTIPLE_INSTANCES_ATOM, true);
    expect(JSON.parse(localStorage.getItem('launch.options') ?? '{}')).toEqual({
      ...OLDER_SETTINGS,
      allowMultipleInstances: true,
    });
    expect(
      mountedStore().get(LAUNCH_OPTION_ALLOW_MULTIPLE_INSTANCES_ATOM),
    ).toBe(true);
  });

  test('adds the launch argument only when on', () => {
    expect(allowMultipleInstancesArgs(true)).toEqual([
      '--ucp-allow-multiple-instances',
    ]);
    expect(allowMultipleInstancesArgs(false)).toEqual([]);
  });
});
