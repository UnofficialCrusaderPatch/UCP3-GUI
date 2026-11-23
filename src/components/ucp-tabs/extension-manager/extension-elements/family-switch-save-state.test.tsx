import { createStore } from 'jotai';
import { render } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getStore } from '../../../../hooks/jotai/base';
import { EXTENSION_STATE_INTERFACE_ATOM } from '../../../../function/extensions/state/state';
import { buildExtensionConfigurationDB } from '../../../../function/configuration/extension-configuration/build-extension-configuration-db';
import { deserializeSimplifiedSerializedExtensionsStateFromExtensions } from '../../../../testing/dump-extensions-state';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';
import { showModalOk } from '../../../modals/modal-ok';
import { MessageResolver } from '../../../../localization/localization';
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
    family?: { name: string; root?: boolean; members?: string[] }[];
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

// Applied depends on Bare; `tunnelsWith` brings in Tunnels, a save-state module.
function appliedActive(
  tunnelsWith: 'Bare' | 'Applied',
  activate: ('Applied' | 'Outside')[] = ['Applied'],
) {
  const state = deserializeSimplifiedSerializedExtensionsStateFromExtensions([
    extension('Bare', {
      family: [{ name: 'ai', root: true, members: ['Applied'] }],
      dependencies: tunnelsWith === 'Bare' ? { Tunnels: '^1.0.0' } : {},
    }),
    extension('Tunnels', { type: 'module', saveState: 'required' }),
    extension('Applied', {
      family: [{ name: 'ai' }],
      dependencies: {
        Bare: '^1.0.0',
        ...(tunnelsWith === 'Applied' ? { Tunnels: '^1.0.0' } : {}),
      },
    }),
    extension('Outside', { dependencies: { Bare: '^1.0.0' } }),
  ] as never);
  const [bare, , applied] = state.extensions;
  getStore().set(
    EXTENSION_STATE_INTERFACE_ATOM,
    buildExtensionConfigurationDB(
      activate.reduce(
        (next, name) =>
          addExtensionToExplicityActivatedExtensions(
            next,
            state.extensions.find((e) => e.name === name)!,
          ),
        state,
      ),
    ),
  );
  return { bare, applied };
}

const localize = ((message: string | { key: string }) =>
  typeof message === 'string' ? message : message.key) as MessageResolver;
const shown = (spec: { title?: unknown; message?: unknown }) => {
  if (typeof spec.message !== 'function') throw Error('Expected a list');
  return render(spec.message(localize)).container.textContent;
};
const activeNames = () =>
  getStore()
    .get(EXTENSION_STATE_INTERFACE_ATOM)
    .activeExtensions.map((e) => e.name)
    .sort();

beforeEach(() => {
  vi.mocked(getStore).mockReturnValue(createStore());
  vi.mocked(showModalOkCancel).mockReset();
  vi.mocked(showModalOk).mockReset();
});

describe('switching family members', () => {
  test('is refused when it would change the save-state modules', async () => {
    const { bare } = appliedActive('Applied');
    await inactiveExtensionElementClickCallback(bare);
    expect(showModalOkCancel).not.toHaveBeenCalled();
    const [[refusal]] = vi.mocked(showModalOk).mock.calls;
    expect(refusal.title).toBe('discovery.family.savestate.title');
    expect(shown(refusal)).toContain('Tunnels (1.0.0)');
    expect(activeNames()).toEqual(['Applied', 'Bare', 'Tunnels']);
  });

  test.each([false, true])(
    'shows one confirmation of what changes (confirm: %s)',
    async (confirm) => {
      const { bare } = appliedActive('Bare');
      vi.mocked(showModalOkCancel).mockResolvedValue(confirm);
      await inactiveExtensionElementClickCallback(bare);
      expect(showModalOkCancel).toHaveBeenCalledTimes(1);
      const [[dialog]] = vi.mocked(showModalOkCancel).mock.calls;
      expect(dialog.title).toBe('discovery.family.change.title');
      expect(shown(dialog)).toContain(
        'discovery.family.change.removedApplied (1.0.0)',
      );
      expect(activeNames()).toEqual(
        confirm ? ['Bare', 'Tunnels'] : ['Applied', 'Bare', 'Tunnels'],
      );
    },
  );

  test('is blocked while an extension outside the family requires the replaced member', async () => {
    const { applied } = appliedActive('Bare', ['Outside']);
    await inactiveExtensionElementClickCallback(applied);
    expect(showModalOkCancel).not.toHaveBeenCalled();
    const [[blocked]] = vi.mocked(showModalOk).mock.calls;
    expect(blocked.title).toBe('discovery.family.conflict.title');
    expect(JSON.stringify(blocked.message)).toContain(
      'ai: Outside → Bare ↔ Applied',
    );
    expect(activeNames()).toEqual(['Bare', 'Outside', 'Tunnels']);
  });

  test('to a member an outside extension already requires keeps that extension', async () => {
    const { bare } = appliedActive('Bare', ['Applied', 'Outside']);
    vi.mocked(showModalOkCancel).mockResolvedValue(true);
    await inactiveExtensionElementClickCallback(bare);
    expect(showModalOk).not.toHaveBeenCalled();
    expect(activeNames()).toEqual(['Bare', 'Outside', 'Tunnels']);
  });
});
