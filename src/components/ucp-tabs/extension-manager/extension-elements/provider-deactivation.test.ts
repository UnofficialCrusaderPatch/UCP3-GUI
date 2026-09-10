import { createStore } from 'jotai';
import { beforeEach, expect, it, vi } from 'vitest';
import { getStore } from '../../../../hooks/jotai/base';
import { Extension } from '../../../../config/ucp/common';
import { ExtensionsState } from '../../../../function/extensions/extensions-state';
import { EXTENSION_STATE_INTERFACE_ATOM } from '../../../../function/extensions/state/state';
import {
  CONFIGURATION_USER_REDUCER_ATOM,
  CONFIGURATION_FULL_REDUCER_ATOM,
  createEmptyConfigurationState,
} from '../../../../function/configuration/state';
import deactivate from './active-extension-element-click-callback';

const mocks = vi.hoisted(() => ({ remove: vi.fn(), confirm: vi.fn() }));
vi.mock('../../../../hooks/jotai/base', () => ({ getStore: vi.fn() }));
vi.mock('../extensions-state-manipulation', () => ({
  removeExtensionFromExplicitlyActivatedExtensions: mocks.remove,
}));
vi.mock('../../../modals/modal-ok-cancel', () => ({
  showModalOkCancel: mocks.confirm,
}));
vi.mock('./reporting', () => ({ default: async () => true }));
vi.mock(
  '../../../../function/configuration/extension-configuration/build-extension-configuration-db',
  () => ({ buildExtensionConfigurationDB: (s: unknown) => s }),
);

const provider = {
  name: 'LOTO',
  version: '3.1.0',
  type: 'plugin',
  io: { path: 'D:/game/ucp/plugins/LOTO-3.1.0' },
} as Extension;
const swapper = { name: 'aiSwapper', version: '1.3.0' } as Extension;
const key = 'aiSwapper.ai.rat.speech';
const baseline = {
  name: 'Rat',
  root: 'ucp/plugins/base/resources/ai/Rat',
  active: true,
};
const selected = {
  name: 'Efendi',
  root: 'ucp/plugins/LOTO/resources/ai/Efendi',
  active: true,
};
const user = {
  [key]: selected,
  'aiSwapper.menu': { rat: [{ ...selected, control: { speech: true } }] },
  'unrelated.setting': true,
};
beforeEach(() => {
  vi.mocked(getStore).mockReturnValue(createStore());
  mocks.confirm.mockResolvedValue(true);
  const config = {
    ...createEmptyConfigurationState(),
    defined: { [key]: baseline },
  };
  const before = {
    extensions: [provider, swapper],
    installedExtensions: [],
    activeExtensions: [provider, swapper],
    explicitlyActivatedExtensions: [provider],
    configuration: config,
  } as unknown as ExtensionsState;
  const after = {
    ...before,
    installedExtensions: [provider],
    activeExtensions: [swapper],
    explicitlyActivatedExtensions: [],
  };
  mocks.remove.mockReturnValue(after);
  getStore().set(EXTENSION_STATE_INTERFACE_ATOM, before);
  getStore().set(CONFIGURATION_USER_REDUCER_ATOM, {
    type: 'reset',
    value: user,
  });
});
it('warns and restores runtime defaults without opening the AI menu', async () => {
  await deactivate(provider);
  expect(mocks.confirm).toHaveBeenCalled();
  expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual({
    'aiSwapper.menu': { rat: [] },
    'unrelated.setting': true,
  });
  expect(getStore().get(CONFIGURATION_FULL_REDUCER_ATOM)[key]).toEqual(
    baseline,
  );
});
it('leaves selection and configuration intact when the user cancels', async () => {
  mocks.confirm.mockResolvedValue(false);
  await deactivate(provider);
  expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual(user);
  expect(
    getStore().get(EXTENSION_STATE_INTERFACE_ATOM).activeExtensions,
  ).toContain(provider);
});
