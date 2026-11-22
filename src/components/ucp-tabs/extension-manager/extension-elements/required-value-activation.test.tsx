import { createStore } from 'jotai';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getStore } from '../../../../hooks/jotai/base';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../../function/configuration/state';
import { EXTENSION_STATE_INTERFACE_ATOM } from '../../../../function/extensions/state/state';
import { buildExtensionConfigurationDB } from '../../../../function/configuration/extension-configuration/build-extension-configuration-db';
import { requiredSettingsExtensions } from '../../../../testing/required-settings-state';
import { MessageResolver } from '../../../../localization/localization';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';
import { addExtensionToExplicityActivatedExtensions } from '../extensions-state-manipulation';
import inactiveExtensionElementClickCallback from './inactive-extension-element-click-callback';

vi.mock('../../../../hooks/jotai/base', () => ({ getStore: vi.fn() }));
vi.mock('../../../modals/modal-ok-cancel', () => ({
  showModalOkCancel: vi.fn(),
}));
vi.mock('../../../modals/modal-ok', () => ({ showModalOk: vi.fn() }));
vi.mock('./reporting', () => ({ default: async () => true }));

const HOTKEYS = 'ucp2-legacy.o_keys.enabled';
const UNRELATED = 'ucp2-legacy.unrelated';
const localize = ((message: string | { key: string; args: object }) =>
  typeof message === 'string'
    ? message
    : `${message.key}:${JSON.stringify(message.args)}`) as MessageResolver;

function legacyOnly(preferences: Record<string, unknown>) {
  const installed = requiredSettingsExtensions();
  const legacy = installed.extensions.find((e) => e.name === 'ucp2-legacy')!;
  getStore().set(CONFIGURATION_USER_REDUCER_ATOM, {
    type: 'reset',
    value: preferences,
  });
  getStore().set(
    EXTENSION_STATE_INTERFACE_ATOM,
    buildExtensionConfigurationDB(
      addExtensionToExplicityActivatedExtensions(installed, legacy),
    ),
  );
  return installed.extensions.find((e) => e.name === 'custom-hotkeys')!;
}

const activeNames = () =>
  getStore()
    .get(EXTENSION_STATE_INTERFACE_ATOM)
    .activeExtensions.map((e) => e.name)
    .sort();

beforeEach(() => {
  vi.mocked(getStore).mockReturnValue(createStore());
  vi.mocked(showModalOkCancel).mockReset();
});

describe('activating an extension with required values', () => {
  test('lists each saved preference it overrides with old and new value', async () => {
    vi.mocked(showModalOkCancel).mockResolvedValue(true);
    const hotkeys = legacyOnly({ [HOTKEYS]: true, [UNRELATED]: 'keep me' });

    await inactiveExtensionElementClickCallback(hotkeys);

    expect(showModalOkCancel).toHaveBeenCalledTimes(1);
    const { title, message } = vi.mocked(showModalOkCancel).mock.calls[0][0];
    expect(title).toBe('extensions.activation.required.repair.title');
    if (typeof message !== 'function') throw Error('Expected a change list');
    const { container } = render(message(localize));
    expect(container.textContent).toContain(HOTKEYS);
    expect(container.textContent).toContain('true → false');
    expect(container.textContent).toContain('custom-hotkeys');
    expect(container.textContent).not.toContain(UNRELATED);
  });

  test('confirming stores the required value in both saved sections', async () => {
    vi.mocked(showModalOkCancel).mockResolvedValue(true);
    const hotkeys = legacyOnly({ [HOTKEYS]: true, [UNRELATED]: 'keep me' });

    await inactiveExtensionElementClickCallback(hotkeys);

    expect(activeNames()).toEqual(['custom-hotkeys', 'ucp2-legacy']);
    expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual({
      [HOTKEYS]: false,
      [UNRELATED]: 'keep me',
    });
    expect(getStore().get(CONFIGURATION_FULL_REDUCER_ATOM)[HOTKEYS]).toBe(
      false,
    );
  });

  test('cancelling leaves extensions and preferences unchanged', async () => {
    vi.mocked(showModalOkCancel).mockResolvedValue(false);
    const hotkeys = legacyOnly({ [HOTKEYS]: true });

    await inactiveExtensionElementClickCallback(hotkeys);

    expect(activeNames()).toEqual(['ucp2-legacy']);
    expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual({
      [HOTKEYS]: true,
    });
  });

  test('a preference that already has the required value needs no confirmation', async () => {
    const hotkeys = legacyOnly({ [HOTKEYS]: false });

    await inactiveExtensionElementClickCallback(hotkeys);

    expect(showModalOkCancel).not.toHaveBeenCalled();
    expect(activeNames()).toEqual(['custom-hotkeys', 'ucp2-legacy']);
    expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual({
      [HOTKEYS]: false,
    });
  });
});
