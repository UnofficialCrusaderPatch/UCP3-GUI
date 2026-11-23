import { createStore } from 'jotai';
import { render } from '@testing-library/react';
import { Range } from 'semver';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  Extension,
  ExtensionType,
  SaveState,
} from '../../../../config/ucp/common';
import { ExtensionsState } from '../../../../function/extensions/extensions-state';
import { ExtensionDependencyTree } from '../../../../function/extensions/dependency-management/dependency-resolution';
import { EXTENSION_STATE_INTERFACE_ATOM } from '../../../../function/extensions/state/state';
import {
  CONFIGURATION_USER_REDUCER_ATOM,
  createEmptyConfigurationState,
} from '../../../../function/configuration/state';
import { getStore } from '../../../../hooks/jotai/base';
import { MessageResolver } from '../../../../localization/localization';
import {
  OkCancelModalWindowProperties,
  showModalOkCancel,
} from '../../../modals/modal-ok-cancel';
import deactivate from './active-extension-element-click-callback';

vi.mock('../../../../hooks/jotai/base', () => ({ getStore: vi.fn() }));
vi.mock('../../../modals/modal-ok-cancel', () => ({
  showModalOkCancel: vi.fn(),
}));
vi.mock('../../../modals/modal-ok', () => ({ showModalOk: vi.fn() }));
vi.mock('./reporting', () => ({ default: async () => true }));

const TITLE = 'extensions.savestate.loss.title';
const localize = ((message: string | { key: string; args: object }) =>
  typeof message === 'string'
    ? message
    : `${message.key}:${JSON.stringify(message.args)}`) as MessageResolver;

function extension(
  name: string,
  type: ExtensionType,
  saveState?: SaveState,
  dependencies: string[] = [],
): Extension {
  const definition = {
    meta: { version: '1.0.0' },
    name,
    version: '1.0.0',
    type,
    author: '',
    description: '',
    'display-name': `${name} display`,
    dependencies: Object.fromEntries(
      dependencies.map((dep) => [dep, new Range('^1.0.0')]),
    ),
    ...(saveState ? { 'save-state': saveState } : {}),
  };
  return {
    meta: { version: '1.0.0' },
    name,
    version: '1.0.0',
    type,
    definition,
    configEntries: {},
    ui: [],
    locales: {},
    description: '',
    config: {
      meta: { version: '1.0.0' },
      'config-sparse': { modules: {}, plugins: {}, 'load-order': [] },
    },
    io: {
      path: `C:/fixture/ucp/${type}s/${name}-1.0.0`,
      isZip: false,
      isDirectory: true,
    },
  } as unknown as Extension;
}

// Pack brings in Tunnelers (required), Projectiles (optional) and Plain (undeclared).
// Other keeps Fixes (optional) active.
const tunnelers = extension('tunnelers', 'module', 'required');
const projectiles = extension('projectiles', 'module', 'optional');
const fixes = extension('fixes', 'module', 'optional');
const plain = extension('plain', 'module');
const pack = extension('pack', 'plugin', undefined, [
  'tunnelers',
  'projectiles',
  'fixes',
  'plain',
]);
const other = extension('other', 'plugin', undefined, ['fixes']);
const all = [pack, other, tunnelers, projectiles, fixes, plain];
const preferences = { 'tunnelers.depth': 3, 'unrelated.option': true };

function setup() {
  const before: ExtensionsState = {
    extensions: all,
    activeExtensions: all,
    explicitlyActivatedExtensions: [pack, other],
    installedExtensions: [],
    onlineAvailableExtensions: [],
    tree: new ExtensionDependencyTree(all, '1.0.17', '3.0.7'),
    configuration: createEmptyConfigurationState(),
  };
  getStore().set(EXTENSION_STATE_INTERFACE_ATOM, before);
  getStore().set(CONFIGURATION_USER_REDUCER_ATOM, {
    type: 'reset',
    value: preferences,
  });
  return getStore().get(EXTENSION_STATE_INTERFACE_ATOM);
}

const saveStateDialogs = () =>
  vi
    .mocked(showModalOkCancel)
    .mock.calls.map(([spec]) => spec as OkCancelModalWindowProperties)
    .filter((spec) => spec.title === TITLE);

const activeNames = () =>
  getStore()
    .get(EXTENSION_STATE_INTERFACE_ATOM)
    .activeExtensions.map((e) => e.name)
    .sort();

beforeEach(() => {
  vi.mocked(getStore).mockReturnValue(createStore());
  vi.mocked(showModalOkCancel).mockReset();
  vi.mocked(showModalOkCancel).mockResolvedValue(true);
});

describe('deactivating an extension whose modules write into saves', () => {
  test('asks nothing when no save-state module leaves the setup', async () => {
    setup();
    await deactivate(other);
    expect(showModalOkCancel).not.toHaveBeenCalled();
    expect(activeNames()).not.toContain('other');
    expect(activeNames()).toContain('fixes');
  });

  test.each([false, true])(
    'lists the declared modules that drop out, required first (confirm: %s)',
    async (confirm) => {
      const before = setup();
      vi.mocked(showModalOkCancel).mockImplementation(
        async (spec) => spec.title !== TITLE || confirm,
      );
      await deactivate(pack);
      const dialogs = saveStateDialogs();
      expect(dialogs).toHaveLength(1);
      const { message } = dialogs[0];
      if (typeof message !== 'function') throw Error('Expected a module list');
      const { container } = render(message(localize));
      expect(
        [...container.querySelectorAll('li')].map((li) => li.textContent),
      ).toEqual([
        'tunnelers display (1.0.0)extensions.savestate.loss.required:{"name":"tunnelers display"}',
        'projectiles display (1.0.0)extensions.savestate.loss.optional:{"name":"projectiles display"}',
      ]);
      if (confirm) {
        expect(activeNames()).toEqual(['fixes', 'other']);
        expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual({
          'unrelated.option': true,
        });
      } else {
        expect(showModalOkCancel).toHaveBeenCalledTimes(1);
        expect(getStore().get(EXTENSION_STATE_INTERFACE_ATOM)).toBe(before);
        expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual(
          preferences,
        );
      }
    },
  );
});

describe('deactivating while the setup changes', () => {
  test('does not commit a preview made from an older setup', async () => {
    setup();
    vi.mocked(showModalOkCancel).mockImplementation(async () => {
      getStore().set(CONFIGURATION_USER_REDUCER_ATOM, {
        type: 'reset',
        value: { 'imported.option': 1 },
      });
      return true;
    });
    await deactivate(pack);
    expect(activeNames()).toContain('pack');
    expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual({
      'imported.option': 1,
    });
  });
});
