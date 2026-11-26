import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createStore } from 'jotai';
import {
  deserializeSimplifiedExtensions,
  SimplifiedSerializedExtension,
} from '../../../../testing/dump-extensions-state';
import { ExtensionsState } from '../../../extensions/extensions-state';
import { createBasicExtensionsState } from '../../../extensions/state/init';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../../extensions/state/state';
import { FIRST_TIME_USE_ATOM } from '../../../gui-settings/settings';
import { getStore } from '../../../../hooks/jotai/base';
import { createExtensionID } from '../../../global/constants/extension-id';
import { setupExtensionsStateConfiguration } from '../../initialization/load-extensions-state';

import { activateFirstTimeUseExtensions } from '../activate-first-time-use-extensions';

import extensions from './extensions.json';

const mocks = vi.hoisted(() => ({
  exists: vi.fn(),
  importConfig: vi.fn(),
  saveConfig: vi.fn(),
  store: undefined as ReturnType<typeof createStore> | undefined,
}));
vi.mock('../../../../hooks/jotai/base', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('../../../../hooks/jotai/base')>();
  return { ...actual, getStore: () => mocks.store ?? actual.getStore() };
});
vi.mock('../../../../tauri/compat/fs', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  exists: mocks.exists,
}));
vi.mock(
  '../../../../components/ucp-tabs/common/importing/import-button-callback',
  () => ({ default: mocks.importConfig }),
);
vi.mock('../../../../components/ucp-tabs/common/save-config', async () => ({
  default: vi.fn(),
  saveCurrentConfig: mocks.saveConfig,
  PROFILE_NOT_LOADED_ATOM: (await import('jotai')).atom(false),
}));

const FRONTEND = '>=1.0.17 <2.0.0';
function extension(
  name: string,
  version: string,
  type: 'module' | 'plugin',
  dependencies: Record<string, string> = {},
  configEntries = {},
) {
  return {
    name,
    version,
    type,
    definition: { name, version, type, dependencies },
    configEntries,
  } as unknown as SimplifiedSerializedExtension;
}
// The bundled extensions plus the UCP3 Basics + Fixes chain, in two versions
function stateWith({ withFixes = true } = {}) {
  const setup = (version: string) =>
    extension('ucp3-basics-fixes', version, 'plugin', {
      'ucp3-basics': '^1.0.0',
      'ucp3-fixes': '^0.2.0',
      frontend: FRONTEND,
    });
  const fixes = extension(
    'ucp3-fixes',
    '0.2.0',
    'plugin',
    { 'worker-delivery-fix': '^0.2.0', frontend: '^1.0.2' },
    {
      'worker-delivery-fix.reachable_delivery': {
        contents: { 'suggested-value': true },
      },
    },
  );
  return createBasicExtensionsState(
    deserializeSimplifiedExtensions([
      ...(JSON.parse(JSON.stringify(extensions)) as SimplifiedSerializedExtension[]),
      extension('graphicsApiReplacer', '1.3.0', 'module', {
        winProcHandler: '>= 0.1.0',
      }),
      extension('worker-delivery-fix', '0.2.0', 'module'),
      ...(withFixes ? [fixes] : []),
      extension('ucp3-basics', '1.0.0', 'plugin', {
        'ucp2-legacy-defaults': '^2.15.1',
        graphicsApiReplacer: '^1.3.0',
        frontend: FRONTEND,
      }),
      setup('0.9.0'),
      setup('1.0.0'),
    ]),
    '1.0.17',
    '3.0.7',
  );
}
const explicit = (state: ExtensionsState) =>
  state.explicitlyActivatedExtensions.map(createExtensionID);

describe('first-time use with the default setup', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    localStorage.clear();
    mocks.store = createStore();
    getStore().set(FIRST_TIME_USE_ATOM, true);
  });

  test('activates only the newest installed setup; its dependencies follow', () => {
    const state = activateFirstTimeUseExtensions(stateWith()).getOrThrow();

    expect(explicit(state)).toEqual(['ucp3-basics-fixes@1.0.0']);
    const active = state.activeExtensions.map(createExtensionID);
    expect(active).toEqual(
      expect.arrayContaining([
        'ucp3-basics@1.0.0',
        'ucp3-fixes@0.2.0',
        'worker-delivery-fix@0.2.0',
        'ucp2-legacy-defaults@2.15.1',
        'graphicsApiReplacer@1.3.0',
      ]),
    );
    expect(active).not.toContain('ucp3-basics-fixes@0.9.0');
    expect(active).not.toContain('graphicsApiReplacer@1.2.0');
    expect(Object.keys(state.configuration.state)).toEqual(
      expect.arrayContaining([
        'ucp2-legacy.ai_attacklimit',
        'worker-delivery-fix.reachable_delivery',
      ]),
    );
  });

  test('falls back to the bundled defaults when the setup cannot be activated', () => {
    const state = activateFirstTimeUseExtensions(
      stateWith({ withFixes: false }),
    ).getOrThrow();
    expect(explicit(state)).toEqual([
      'graphicsApiReplacer@1.3.0',
      'ucp2-legacy-defaults@2.15.1',
    ]);
  });

  test.each([
    ['a fresh game folder saves the setup', false, ['ucp3-basics-fixes@1.0.0']],
    ['an existing configuration is loaded instead', true, []],
  ])('on startup, %s', async (_, profileExists, expected) => {
    mocks.exists.mockResolvedValue(profileExists);
    mocks.importConfig.mockResolvedValue({ status: 'ok' });
    const result = await setupExtensionsStateConfiguration(
      stateWith(),
      'D:/game',
      'D:/game/ucp-config.yml',
    );

    expect(result.isOk()).toBe(true);
    expect(explicit(getStore().get(EXTENSION_STATE_REDUCER_ATOM))).toEqual(
      expected,
    );
    expect(mocks.saveConfig.mock.calls).toEqual(
      profileExists ? [] : [[{ file: 'D:/game/ucp-config.yml' }]],
    );
    expect(mocks.importConfig).toHaveBeenCalledTimes(profileExists ? 1 : 0);
  });
});
