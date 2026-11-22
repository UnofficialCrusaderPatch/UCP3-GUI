import { createStore } from 'jotai';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getStore } from '../../../../hooks/jotai/base';
import { EXTENSION_STATE_INTERFACE_ATOM } from '../../../../function/extensions/state/state';
import { buildExtensionConfigurationDB } from '../../../../function/configuration/extension-configuration/build-extension-configuration-db';
import { deserializeSimplifiedSerializedExtensionsStateFromExtensions } from '../../../../testing/dump-extensions-state';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';
import { addExtensionToExplicityActivatedExtensions } from '../extensions-state-manipulation';
import inactiveExtensionElementClickCallback from './inactive-extension-element-click-callback';

vi.mock('../../../../hooks/jotai/base', async (original) => ({
  ...(await original<typeof import('../../../../hooks/jotai/base')>()),
  getStore: vi.fn(),
}));
vi.mock('../../../modals/modal-ok-cancel', () => ({
  showModalOkCancel: vi.fn(),
}));
vi.mock('../../../modals/modal-ok', () => ({ showModalOk: vi.fn() }));
vi.mock('./reporting', () => ({ default: async () => true }));

function extension(
  name: string,
  {
    type = 'plugin',
    dependencies = {},
    family,
    saveState,
  }: {
    type?: 'plugin' | 'module';
    dependencies?: Record<string, string>;
    family?: { name: string; root?: boolean }[];
    saveState?: 'required' | 'optional';
  } = {},
) {
  return {
    name,
    version: '1.0.0',
    type,
    definition: {
      meta: { version: '1.0.0' },
      name,
      version: '1.0.0',
      author: 'test',
      dependencies,
      'display-name': name,
      description: '',
      type,
      ...(family ? { family } : {}),
      ...(saveState ? { 'save-state': saveState } : {}),
    },
    configEntries: {},
  };
}

function appliedWithTunnels() {
  const state = deserializeSimplifiedSerializedExtensionsStateFromExtensions([
    extension('Bare', { family: [{ name: 'ai', root: true }] }),
    extension('Tunnels', { type: 'module', saveState: 'required' }),
    extension('Applied', {
      family: [{ name: 'ai' }],
      dependencies: { Bare: '^1.0.0', Tunnels: '^1.0.0' },
    }),
  ] as never);
  const [bare, tunnels, applied] = state.extensions;
  getStore().set(
    EXTENSION_STATE_INTERFACE_ATOM,
    buildExtensionConfigurationDB(
      addExtensionToExplicityActivatedExtensions(state, applied),
    ),
  );
  return { bare, tunnels, applied };
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

describe('switching family members', () => {
  test('warns before a save-state module leaves the setup, and Cancel changes nothing', async () => {
    const { bare } = appliedWithTunnels();
    vi.mocked(showModalOkCancel).mockResolvedValueOnce(false);

    await inactiveExtensionElementClickCallback(bare);

    expect(showModalOkCancel).toHaveBeenCalledTimes(1);
    expect(vi.mocked(showModalOkCancel).mock.calls[0][0].title).toBe(
      'extensions.savestate.loss.title',
    );
    expect(activeNames()).toEqual(['Applied', 'Bare', 'Tunnels']);
  });

  test('switches after the player confirms', async () => {
    const { bare } = appliedWithTunnels();
    vi.mocked(showModalOkCancel).mockResolvedValueOnce(true);

    await inactiveExtensionElementClickCallback(bare);

    expect(activeNames()).toEqual(['Bare']);
  });

  test('a switch that keeps every save-state module asks nothing', async () => {
    const state = deserializeSimplifiedSerializedExtensionsStateFromExtensions([
      extension('Bare', {
        family: [{ name: 'ai', root: true }],
        dependencies: { Tunnels: '^1.0.0' },
      }),
      extension('Tunnels', { type: 'module', saveState: 'required' }),
      extension('Applied', {
        family: [{ name: 'ai' }],
        dependencies: { Bare: '^1.0.0' },
      }),
    ] as never);
    const [bare, , applied] = state.extensions;
    getStore().set(
      EXTENSION_STATE_INTERFACE_ATOM,
      buildExtensionConfigurationDB(
        addExtensionToExplicityActivatedExtensions(state, applied),
      ),
    );

    await inactiveExtensionElementClickCallback(bare);

    expect(showModalOkCancel).not.toHaveBeenCalled();
    expect(activeNames()).toEqual(['Bare', 'Tunnels']);
  });
});
