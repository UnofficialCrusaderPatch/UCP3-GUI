import { createStore, Provider } from 'jotai';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { Range } from 'semver';
import { parse } from 'yaml';
import { Extension } from '../../../../../config/ucp/common';
import { ExtensionsState } from '../../../../../function/extensions/extensions-state';
import { ExtensionDependencyTree } from '../../../../../function/extensions/dependency-management/dependency-resolution';
import {
  planUninstall,
  uninstallErrors,
} from '../../../../../function/extensions/dependency-management/uninstall';
import { EXTENSION_STATE_INTERFACE_ATOM } from '../../../../../function/extensions/state/state';
import { CONFIGURATION_DISK_STATE_ATOM } from '../../../../../function/extensions/state/disk';
import {
  CONFIGURATION_USER_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  UCP_CONFIG_FILE_ATOM,
  createEmptyConfigurationState,
} from '../../../../../function/configuration/state';
import { getStore } from '../../../../../hooks/jotai/base';
import Result from '../../../../../util/structs/result';
import {
  BUSY_CONTENT_COUNT,
  CONTENT_INTERFACE_STATE_ATOM,
  CONTENT_UNINSTALL_ERRORS_ATOM,
} from '../../state/atoms';
import { ContentElement } from '../../../../../function/content/types/content-element';
import { ContentElementView } from '../../content-element/content-element-view';
import { UninstallButton } from '../uninstall-button';
import { uninstallContentButtonCallback } from './uninstall-button-callback';
import { OkCancelModalWindowProperties } from '../../../../modals/modal-ok-cancel';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  modal: vi.fn(),
  write: vi.fn(),
  remove: vi.fn(),
}));
vi.mock('../../../../../hooks/jotai/base', async (original) => ({
  ...(await original<object>()),
  getStore: vi.fn(),
}));
vi.mock('../../../../modals/modal-ok-cancel', () => ({
  showModalOkCancel: mocks.confirm,
}));
vi.mock('../../../../modals/modal-ok', () => ({ showModalOk: mocks.modal }));
vi.mock('../../../../../tauri/tauri-files', async (original) => ({
  ...(await original<object>()),
  writeTextFile: mocks.write,
  removeDir: mocks.remove,
}));
vi.mock('../../../../../function/game-folder/interface', async (original) => {
  const { atom } = await import('jotai');
  return {
    ...(await original<object>()),
    GAME_FOLDER_ATOM: atom('C:/fixture'),
  };
});
vi.mock('../../../../../function/content/store/fetch', async (original) => ({
  ...(await original<object>()),
  fetchStore: async () => ({ extensions: { list: [] } }),
}));
vi.mock('../../../../general/message', () => ({
  useMessage: () => (message: string | { key: string }) =>
    typeof message === 'string' ? message : message.key,
  default: () => null,
}));

function extension(
  name: string,
  dependencies: Record<string, string> = {},
  version = '1.0.0',
): Extension {
  return {
    meta: { version: '1.0.0' },
    name,
    version,
    type: 'plugin',
    configEntries: {},
    ui: [],
    locales: {},
    description: '',
    config: {
      meta: { version: '1.0.0' },
      'config-sparse': { modules: {}, plugins: {}, 'load-order': [] },
    },
    definition: {
      meta: { version: '1.0.0' },
      name,
      version,
      type: 'plugin',
      author: '',
      description: '',
      'display-name': name,
      dependencies: Object.fromEntries(
        Object.entries(dependencies).map(([key, range]) => [
          key,
          new Range(range),
        ]),
      ),
    },
    io: {
      path: `C:/fixture/ucp/plugins/${name}-${version}`,
      isZip: false,
      isDirectory: true,
      fetchDescription: async () => '',
      handle: async () => {
        throw Error('Fixture has no filesystem handle');
      },
    },
  };
}
const files = extension('Files');
const applied = extension('Applied', { Files: '^1.0.0' });
const independent = extension('Independent');
function state(
  extensions: Extension[],
  active: Extension[] = [],
  explicit = active,
): ExtensionsState {
  return {
    extensions,
    activeExtensions: active,
    explicitlyActivatedExtensions: explicit,
    installedExtensions: extensions.filter((ext) => !active.includes(ext)),
    onlineAvailableExtensions: [],
    tree: new ExtensionDependencyTree(extensions, '1.0.17', '3.0.7'),
    configuration: createEmptyConfigurationState(),
  };
}
function content(ext: Extension): ContentElement {
  return {
    definition: ext.definition,
    extension: ext,
    installed: true,
    online: true,
    contents: { package: [], description: [] },
  } as unknown as ContentElement;
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getStore).mockReturnValue(createStore());
  mocks.confirm.mockResolvedValue(true);
  mocks.modal.mockResolvedValue(undefined);
  mocks.write.mockResolvedValue(Result.emptyOk());
  mocks.remove.mockResolvedValue(Result.emptyOk());
  getStore().set(UCP_CONFIG_FILE_ATOM, 'C:/fixture/ucp-config.yml');
});
function setup(
  extensions = [applied, files, independent],
  active = [applied, files, independent],
  explicit = [applied, independent],
) {
  getStore().set(
    EXTENSION_STATE_INTERFACE_ATOM,
    state(extensions, active, explicit),
  );
  getStore().set(CONFIGURATION_DISK_STATE_ATOM, active);
  getStore().set(CONFIGURATION_USER_REDUCER_ATOM, {
    type: 'reset',
    value: { 'Applied.option': true, 'Independent.option': 42 },
  });
  getStore().set(CONFIGURATION_TOUCHED_REDUCER_ATOM, {
    type: 'reset',
    value: { 'Independent.option': true },
  });
  return getStore().get(EXTENSION_STATE_INTERFACE_ATOM);
}
it('protects providers needed by inactive installed extensions', () => {
  expect(
    uninstallErrors(state([files, applied]), ['Files@1.0.0']).length,
  ).toBeGreaterThan(0);
  expect(uninstallErrors(state([files, applied]), ['Applied@1.0.0'])).toEqual(
    [],
  );
});
it('keeps the dependency tree on the active pinned version after an unrelated removal', async () => {
  const other = extension('Files', {}, '1.1.0');
  const disposable = extension('Disposable');
  const before = setup(
    [applied, files, other, disposable],
    [applied, files],
    [applied],
  );
  before.tree.extensionDependenciesForExtensions(before.activeExtensions);
  expect(before.tree.directExtensionDependenciesFor(applied)).toEqual([files]);
  await uninstallContentButtonCallback([content(disposable)], []);
  expect(mocks.remove).toHaveBeenCalledTimes(1);
  const after = getStore().get(EXTENSION_STATE_INTERFACE_ATOM);
  expect(after.activeExtensions).toEqual([applied, files]);
  expect(after.tree.directExtensionDependenciesFor(applied)).toEqual([files]);
  expect(after.tree.extensions).not.toContain(disposable);
});
it('allows another installed provider version but protects an active pinned version', () => {
  const other = extension('Files', {}, '1.1.0');
  expect(
    uninstallErrors(state([files, other, applied]), ['Files@1.0.0']),
  ).toEqual([]);
  expect(
    uninstallErrors(
      state([files, other, applied], [applied, files], [applied]),
      ['Files@1.0.0'],
    ).length,
  ).toBeGreaterThan(0);
});
it('validates a provider/dependent batch as a whole', () => {
  expect(
    uninstallErrors(state([files, applied], [applied, files], [applied]), [
      'Files@1.0.0',
      'Applied@1.0.0',
    ]),
  ).toEqual([]);
});
it('caches eligibility and invalidates it when installed packages change', () => {
  const store = getStore();
  store.set(EXTENSION_STATE_INTERFACE_ATOM, state([files]));
  const first = store.get(CONTENT_UNINSTALL_ERRORS_ATOM);
  expect(store.get(CONTENT_UNINSTALL_ERRORS_ATOM)).toBe(first);
  expect(first['Files@1.0.0']).toEqual([]);
  store.set(EXTENSION_STATE_INTERFACE_ATOM, state([files, applied]));
  expect(
    store.get(CONTENT_UNINSTALL_ERRORS_ATOM)['Files@1.0.0'].length,
  ).toBeGreaterThan(0);
  store.set(EXTENSION_STATE_INTERFACE_ATOM, state([files]));
  expect(store.get(CONTENT_UNINSTALL_ERRORS_ATOM)['Files@1.0.0']).toEqual([]);
});
it('allows selecting active rows and reviewing dependent removal for a provider', () => {
  setup();
  const ce = content(files);
  render(
    <Provider store={getStore()}>
      <ContentElementView data={ce} />
      <UninstallButton />
    </Provider>,
  );
  fireEvent.click(screen.getByText('Files'));
  expect(getStore().get(CONTENT_INTERFACE_STATE_ATOM).selected).toEqual([ce]);
  expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(
    false,
  );
});
it('cancel leaves memory, disk and package files untouched', async () => {
  const before = setup();
  mocks.confirm.mockResolvedValue(false);
  await uninstallContentButtonCallback([content(applied)], []);
  expect(getStore().get(EXTENSION_STATE_INTERFACE_ATOM)).toBe(before);
  expect(
    getStore().get(CONFIGURATION_USER_REDUCER_ATOM)['Applied.option'],
  ).toBe(true);
  expect(
    getStore().get(CONFIGURATION_TOUCHED_REDUCER_ATOM)['Independent.option'],
  ).toBe(true);
  expect(mocks.write).not.toHaveBeenCalled();
  expect(mocks.remove).not.toHaveBeenCalled();
  expect(getStore().get(BUSY_CONTENT_COUNT)).toBe(0);
});
it('save failure leaves the active setup and package intact', async () => {
  const before = setup();
  mocks.write.mockResolvedValue(Result.err('disk full'));
  await uninstallContentButtonCallback([content(applied)], []);
  expect(getStore().get(EXTENSION_STATE_INTERFACE_ATOM)).toBe(before);
  expect(getStore().get(CONFIGURATION_DISK_STATE_ATOM)).toContain(applied);
  expect(mocks.remove).not.toHaveBeenCalled();
  expect(mocks.modal).toHaveBeenCalled();
});
it('saves deactivation before deletion, retaining other pending preferences', async () => {
  setup();
  mocks.remove.mockImplementation(async () => {
    const saved = parse(mocks.write.mock.calls[0][1]);
    expect(
      saved['config-full']['load-order'].map(
        (entry: { extension: string }) => entry.extension,
      ),
    ).toEqual(['Independent']);
    expect(
      saved['config-sparse'].plugins.Independent.config.option.contents[
        'suggested-value'
      ],
    ).toBe(42);
    expect(getStore().get(CONFIGURATION_DISK_STATE_ATOM)).toEqual([
      independent,
    ]);
    return Result.emptyOk();
  });
  await uninstallContentButtonCallback([content(applied)], []);
  expect(mocks.remove).toHaveBeenCalledTimes(1);
  const after = getStore().get(EXTENSION_STATE_INTERFACE_ATOM);
  expect(after.extensions).toEqual([files, independent]);
  expect(after.activeExtensions).toEqual([independent]);
  expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual({
    'Independent.option': 42,
  });
  expect(getStore().get(CONFIGURATION_TOUCHED_REDUCER_ATOM)).toEqual({});
});
it('saves a disk-only reference before uninstalling an already deactivated package', async () => {
  setup([applied, files], [], []);
  getStore().set(CONFIGURATION_DISK_STATE_ATOM, [applied, files]);
  await uninstallContentButtonCallback([content(applied)], []);
  expect(mocks.confirm).toHaveBeenCalled();
  expect(mocks.write).toHaveBeenCalledTimes(1);
  expect(
    parse(mocks.write.mock.calls[0][1])['config-full']['load-order'],
  ).toEqual([]);
  expect(mocks.remove).toHaveBeenCalledTimes(1);
});
it('reviews and removes dependent plugins before their selected provider', async () => {
  setup();
  await uninstallContentButtonCallback([content(files)], []);
  expect(mocks.confirm).toHaveBeenCalled();
  expect(mocks.remove.mock.calls.map(([path]) => path)).toEqual([
    'C:/fixture/ucp/plugins/Applied-1.0.0',
    'C:/fixture/ucp/plugins/Files-1.0.0',
  ]);
  expect(getStore().get(EXTENSION_STATE_INTERFACE_ATOM).extensions).toEqual([
    independent,
  ]);
});

it('expands a transitive installed dependent chain without unrelated packages', () => {
  const pack = extension('Pack', { Applied: '^1.0.0' });
  const plan = planUninstall(state([pack, applied, files, independent]), [
    'Files@1.0.0',
  ]);
  expect(plan.dependents.map((ext) => ext.name)).toEqual(['Pack', 'Applied']);
  expect(plan.errors).toEqual([]);
});

it('uses alternative installed versions but preserves actual active pins', () => {
  const other = extension('Files', {}, '1.1.0');
  expect(
    planUninstall(state([files, other, applied]), ['Files@1.0.0']).dependents,
  ).toEqual([]);
  expect(
    planUninstall(state([files, other, applied], [applied, files], [applied]), [
      'Files@1.0.0',
    ]).dependents,
  ).toEqual([applied]);
});

it('optionally removes only unused dependencies of the removal set', () => {
  const leaf = extension('Leaf');
  const middle = extension('Middle', { Leaf: '^1.0.0' });
  const pack = extension('Pack', { Middle: '^1.0.0' });
  const all = state([leaf, middle, pack, independent]);
  expect(planUninstall(all, ['Pack@1.0.0']).unused).toEqual([]);
  const cleanup = planUninstall(all, ['Pack@1.0.0'], true);
  expect(cleanup.unused.map((ext) => ext.name)).toEqual(['Middle', 'Leaf']);
  expect(cleanup.errors).toEqual([]);
});

it('retains dependencies used by an inactive installed package and explicit Bare choices', () => {
  const another = extension('Another', { Files: '^1.0.0' });
  expect(
    planUninstall(state([files, applied, another]), ['Applied@1.0.0'], true)
      .unused,
  ).toEqual([]);
  expect(
    planUninstall(
      state([files, applied], [files], [files]),
      ['Applied@1.0.0'],
      true,
    ).unused,
  ).toEqual([]);
});

it('does not cascade an unrelated pre-existing invalid package graph', () => {
  const broken = extension('Broken', { Missing: '^1.0.0' });
  const plan = planUninstall(state([files, broken]), ['Files@1.0.0']);
  expect(plan.errors.length).toBeGreaterThan(0);
  expect(plan.dependents).toEqual([]);
});

it('lets the cleanup checkbox remove the unused provider after its package', async () => {
  setup();
  mocks.confirm.mockImplementation(
    async (spec: Partial<OkCancelModalWindowProperties>) => {
      if (spec.children) {
        const view = render(<div>{spec.children}</div>);
        fireEvent.click(screen.getByRole('checkbox'));
        view.unmount();
      }
      return true;
    },
  );
  await uninstallContentButtonCallback([content(applied)], []);
  expect(mocks.remove.mock.calls.map(([path]) => path)).toEqual([
    'C:/fixture/ucp/plugins/Applied-1.0.0',
    'C:/fixture/ucp/plugins/Files-1.0.0',
  ]);
  expect(getStore().get(EXTENSION_STATE_INTERFACE_ATOM).extensions).toEqual([
    independent,
  ]);
});

it('cancels the complete dependent chain without saving or removing anything', async () => {
  const before = setup();
  mocks.confirm.mockResolvedValue(false);
  await uninstallContentButtonCallback([content(files)], []);
  expect(getStore().get(EXTENSION_STATE_INTERFACE_ATOM)).toBe(before);
  expect(mocks.write).not.toHaveBeenCalled();
  expect(mocks.remove).not.toHaveBeenCalled();
});
it('revalidates after confirmation instead of overwriting newer choices', async () => {
  setup();
  mocks.confirm.mockImplementation(async () => {
    getStore().set(CONFIGURATION_USER_REDUCER_ATOM, {
      type: 'reset',
      value: { 'Independent.option': 99 },
    });
    return true;
  });
  await uninstallContentButtonCallback([content(applied)], []);
  expect(mocks.write).not.toHaveBeenCalled();
  expect(mocks.remove).not.toHaveBeenCalled();
  expect(
    getStore().get(CONFIGURATION_USER_REDUCER_ATOM)['Independent.option'],
  ).toBe(99);
});
it('removes a dependent before its provider even if selected in reverse order', async () => {
  setup([files, applied], [], []);
  getStore().set(CONFIGURATION_USER_REDUCER_ATOM, { type: 'reset', value: {} });
  await uninstallContentButtonCallback([content(files), content(applied)], []);
  expect(mocks.remove.mock.calls.map(([path]) => path)).toEqual([
    'C:/fixture/ucp/plugins/Applied-1.0.0',
    'C:/fixture/ucp/plugins/Files-1.0.0',
  ]);
  expect(getStore().get(EXTENSION_STATE_INTERFACE_ATOM).extensions).toEqual([]);
});
it('retains a provider if its dependent fails to uninstall', async () => {
  setup([files, applied], [], []);
  getStore().set(CONFIGURATION_USER_REDUCER_ATOM, { type: 'reset', value: {} });
  mocks.remove.mockResolvedValue(Result.err('access denied'));
  await uninstallContentButtonCallback([content(files), content(applied)], []);
  expect(mocks.remove).toHaveBeenCalledTimes(1);
  expect(mocks.remove.mock.calls[0][0]).toContain('Applied');
  expect(getStore().get(EXTENSION_STATE_INTERFACE_ATOM).extensions).toEqual([
    files,
    applied,
  ]);
});
