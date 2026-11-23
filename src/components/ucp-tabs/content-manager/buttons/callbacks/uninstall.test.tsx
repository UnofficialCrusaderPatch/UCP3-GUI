import { createStore, Provider } from 'jotai';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { Range } from 'semver';
import { parse } from 'yaml';
import { Extension, SaveState } from '../../../../../config/ucp/common';
import { MessageResolver } from '../../../../../localization/localization';
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
  EXTENSIONS_STATE_IS_DISK_DIRTY_ATOM,
} from '../../state/atoms';
import { ContentElement } from '../../../../../function/content/types/content-element';
import { ContentElementView } from '../../content-element/content-element-view';
import { UninstallButton } from '../uninstall-button';
import { uninstallContentButtonCallback } from './uninstall-button-callback';
import { reloadCurrentGameFolder } from '../../../../../function/game-folder/modifications/reload-current-game-folder';
import { OkCancelModalWindowProperties } from '../../../../modals/modal-ok-cancel';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from '../../../common/buttons/config-serialized-state';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  modal: vi.fn(),
  write: vi.fn(),
  remove: vi.fn(),
  removeFile: vi.fn(),
  exists: vi.fn(),
  load: vi.fn(),
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
  removeFile: mocks.removeFile,
  onFsExists: mocks.exists,
}));
vi.mock(
  '../../../../../config/ucp/config-files/config-files',
  async (original) => ({
    ...(await original<object>()),
    loadConfigFromFile: mocks.load,
  }),
);
vi.mock(
  '../../../../../function/game-folder/modifications/reload-current-game-folder',
  () => ({ reloadCurrentGameFolder: vi.fn() }),
);
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
  mocks.removeFile.mockResolvedValue(Result.emptyOk());
  mocks.exists.mockResolvedValue(false);
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
const otherFiles = extension('Files', {}, '1.1.0');
const SAVE_STATE_TITLE = 'extensions.savestate.loss.title';
const saveStateDialog = () =>
  mocks.confirm.mock.calls
    .map(([spec]) => spec as OkCancelModalWindowProperties)
    .find((spec) => spec.title === SAVE_STATE_TITLE);
it.each([
  ['a provider an inactive installed package needs', state([files, applied]), 'Files@1.0.0', true, [applied]],
  ['a dependent', state([files, applied]), 'Applied@1.0.0', false, []],
  ['a provider with another installed version', state([files, otherFiles, applied]), 'Files@1.0.0', false, []],
  ['an active pinned provider version', state([files, otherFiles, applied], [applied, files], [applied]), 'Files@1.0.0', true, [applied]],
])('removing %s', (_, installed, id, blocked, dependents) => {
  expect(uninstallErrors(installed, [id]).length > 0).toBe(blocked);
  expect(planUninstall(installed, [id]).dependents).toEqual(dependents);
});
it('keeps the dependency tree on the active pinned version after an unrelated removal', async () => {
  const disposable = extension('Disposable');
  const before = setup(
    [applied, files, otherFiles, disposable],
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
it('validates a provider/dependent batch as a whole', () => {
  expect(
    uninstallErrors(state([files, applied], [applied, files], [applied]), [
      'Files@1.0.0',
      'Applied@1.0.0',
    ]),
  ).toEqual([]);
});
it('invalidates eligibility when installed packages change', () => {
  const store = getStore();
  store.set(EXTENSION_STATE_INTERFACE_ATOM, state([files]));
  expect(store.get(CONTENT_UNINSTALL_ERRORS_ATOM)['Files@1.0.0']).toEqual([]);
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
it('cancelling the dependent chain leaves memory, disk and package files untouched', async () => {
  const before = setup();
  mocks.confirm.mockResolvedValue(false);
  await uninstallContentButtonCallback([content(files)], []);
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
  expect(saveStateDialog()).toBeUndefined();
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
it.each([
  ['the provider', [files]],
  ['both, in reverse order', [files, applied]],
])(
  'reviews and removes dependents before their provider when selecting %s',
  async (_, selected) => {
    setup();
    await uninstallContentButtonCallback(selected.map(content), []);
    expect(mocks.confirm).toHaveBeenCalled();
    expect(mocks.remove.mock.calls.map(([path]) => path)).toEqual([
      'C:/fixture/ucp/plugins/Applied-1.0.0',
      'C:/fixture/ucp/plugins/Files-1.0.0',
    ]);
    expect(getStore().get(EXTENSION_STATE_INTERFACE_ATOM).extensions).toEqual(
      [independent],
    );
  },
);
it('expands a transitive installed dependent chain without unrelated packages', () => {
  const pack = extension('Pack', { Applied: '^1.0.0' });
  const plan = planUninstall(state([pack, applied, files, independent]), [
    'Files@1.0.0',
  ]);
  expect(plan.dependents.map((ext) => ext.name)).toEqual(['Pack', 'Applied']);
  expect(plan.errors).toEqual([]);
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
it.each([
  [
    'an unrelated package with a missing dependency',
    () => [files, extension('Broken', { Missing: '^1.0.0' })],
    'Files@1.0.0',
    true,
  ],
  [
    'a package that already failed a full solve',
    () => [
      extension('Core', {}, '1.0.0'),
      extension('Core', {}, '2.0.0'),
      extension('Bridge', { Core: '^1.0.0' }),
      extension('Broken', { Bridge: '^1.0.0', Core: '^2.0.0' }),
      extension('Unrelated'),
    ],
    'Unrelated@1.0.0',
    false,
  ],
])('does not cascade into %s', (_, installed, id, reported) => {
  const plan = planUninstall(state(installed()), [id]);
  expect(plan.dependents).toEqual([]);
  expect(plan.errors.length > 0).toBe(reported);
});
it('can remove a broken selected package when that repairs the installed graph', () => {
  const broken = extension('Broken', { Missing: '^1.0.0' });
  const plan = planUninstall(state([files, broken]), ['Broken@1.0.0'], true);
  expect(plan.errors).toEqual([]);
  expect(plan.dependents).toEqual([]);
  expect(plan.unused).toEqual([]);
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
function reviewRecoverable() {
  const review = mocks.confirm.mock
    .calls[0][0] as OkCancelModalWindowProperties;
  return (
    review.children as { props: { recoverable: (ext: Extension) => boolean } }
  ).props.recoverable;
}
it.each([
  ['an installable Store source', 'github-binary', false, true],
  ['only an unsupported source', 'github-zip', false, false],
  ['a deprecated Store entry', 'github-binary', true, false],
])(
  'marks a removed exact version with %s as reinstallable only when the installer accepts it',
  async (_, method, deprecated, recoverable) => {
    setup();
    const entry = {
      ...content(applied),
      contents: { package: [{ method }], description: [] },
    } as unknown as ContentElement;
    mocks.confirm.mockResolvedValueOnce(false);
    await uninstallContentButtonCallback(
      [entry],
      deprecated ? [content(applied)] : [],
    );
    expect(reviewRecoverable()(applied)).toBe(recoverable);
    expect(mocks.remove).not.toHaveBeenCalled();
  },
);
// Every dependency edge keeps a candidate, but Client needs Core 2.
function coreVersions() {
  const cores = ['1.0.0', '2.0.0', '3.0.0'].map((v) =>
    extension('Core', {}, v),
  );
  const bridge = extension('Bridge', { Core: '^1.0.0 || ^2.0.0' });
  const client = extension('Client', {
    Bridge: '^1.0.0',
    Core: '^2.0.0 || ^3.0.0',
  });
  return { cores, all: [...cores, bridge, client], client };
}
it('blocks removing a provider whose dependent would no longer fully resolve', () => {
  const { all } = coreVersions();
  expect(uninstallErrors(state(all), ['Core@2.0.0']).length).toBe(1);
  expect(
    planUninstall(state(all), ['Core@2.0.0']).dependents.map(
      (ext) => ext.name,
    ),
  ).toEqual(['Client']);
});
it('keeps a provider when the dependent that needs it fails to uninstall', async () => {
  const { cores, all, client } = coreVersions();
  setup(all, [], []);
  getStore().set(CONFIGURATION_USER_REDUCER_ATOM, { type: 'reset', value: {} });
  mocks.remove.mockImplementation(async (path: string) =>
    path.includes('Client') ? Result.err('access denied') : Result.emptyOk(),
  );
  await uninstallContentButtonCallback([content(cores[1])], []);
  expect(mocks.remove.mock.calls.map(([path]) => path)).toEqual([
    client.io.path,
  ]);
  expect(
    getStore()
      .get(EXTENSION_STATE_INTERFACE_ATOM)
      .extensions.map((ext) => `${ext.name}@${ext.version}`),
  ).toContain('Core@2.0.0');
});
it('saves first when the profile on disk still uses the package after an unapplied import', async () => {
  setup([applied, files], [], []);
  // An imported setup without Applied replaced the disk snapshot, and no
  // preference of Applied is set, so only the file itself shows it is in use.
  getStore().set(CONFIGURATION_DISK_STATE_ATOM, []);
  getStore().set(CONFIGURATION_USER_REDUCER_ATOM, { type: 'reset', value: {} });
  mocks.exists.mockResolvedValue(true);
  mocks.load.mockResolvedValue({
    status: 'OK',
    message: '',
    result: {
      'config-sparse': {
        modules: {},
        plugins: {},
        'load-order': [{ extension: 'Applied', version: '1.0.0' }],
      },
    },
  });
  await uninstallContentButtonCallback([content(applied)], []);
  expect(mocks.write).toHaveBeenCalledTimes(1);
  expect(
    parse(mocks.write.mock.calls[0][1])['config-full']['load-order'],
  ).toEqual([]);
  expect(mocks.remove).toHaveBeenCalledTimes(1);
});
it.each([true, false])(
  'asks to reload instead of removing when packages changed on disk (reload: %s)',
  async (accept) => {
    setup();
    getStore().set(EXTENSIONS_STATE_IS_DISK_DIRTY_ATOM, true);
    mocks.confirm.mockResolvedValueOnce(accept);
    await uninstallContentButtonCallback([content(independent)], []);
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(mocks.confirm.mock.calls[0][0].title).toBe(
      'extensions.reload.required.title',
    );
    expect(reloadCurrentGameFolder).toHaveBeenCalledTimes(accept ? 1 : 0);
    expect(getStore().get(BUSY_CONTENT_COUNT)).toBe(0);
    expect(mocks.write).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
  },
);
it('records the written setup and deletes nothing when settings change during the save', async () => {
  setup();
  mocks.write.mockImplementationOnce(async () => {
    getStore().set(CONFIGURATION_USER_REDUCER_ATOM, {
      type: 'reset',
      value: { 'Independent.option': 7 },
    });
    return Result.emptyOk();
  });
  await uninstallContentButtonCallback([content(applied)], []);
  expect(mocks.write).toHaveBeenCalledTimes(1);
  expect(mocks.remove).not.toHaveBeenCalled();
  expect(
    getStore()
      .get(CONFIGURATION_DISK_STATE_ATOM)
      .map((ext) => ext.name),
  ).not.toContain('Applied');
  expect(getStore().get(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM)).toBe(true);
  expect(mocks.modal).toHaveBeenCalled();
});
function saveStateModule(name: string, saveState: SaveState): Extension {
  const base = extension(name);
  return {
    ...base,
    type: 'module',
    definition: { ...base.definition, type: 'module', 'save-state': saveState },
    io: { ...base.io, path: `C:/fixture/ucp/modules/${name}-1.0.0.zip` },
  };
}
function saveStateWarningText() {
  const dialog = saveStateDialog();
  if (typeof dialog?.message !== 'function')
    throw Error('Expected the save-state warning');
  const localize = ((message: string | { key: string }) =>
    typeof message === 'string' ? message : message.key) as MessageResolver;
  const view = render(<div>{dialog.message(localize)}</div>);
  const text = view.container.textContent;
  view.unmount();
  return text;
}
const declineSaveStateLoss = (spec: Partial<OkCancelModalWindowProperties>) =>
  Promise.resolve(spec.title !== SAVE_STATE_TITLE);
it.each([
  ['an inactive installed module', 'Tunnelers', () => [applied, files, independent], [applied, independent]],
  ['a module that only drops out of the setup', 'Pack', () => [extension('Pack', { Tunnelers: '^1.0.0' }), independent], undefined],
])('warns before removing %s, and cancel changes nothing', async (_, selected, others, explicit) => {
  const tunnelers = saveStateModule('Tunnelers', 'required');
  const rest = others();
  const all = [...rest, tunnelers];
  const before = explicit
    ? setup(all, rest, explicit)
    : setup(all, all, rest);
  mocks.confirm.mockImplementation(declineSaveStateLoss);
  const target = all.find((ext) => ext.name === selected)!;
  await uninstallContentButtonCallback([content(target)], []);
  const text = saveStateWarningText();
  expect(text).toContain('Tunnelers (1.0.0)');
  expect(text).toContain('extensions.savestate.loss.required');
  expect(getStore().get(EXTENSION_STATE_INTERFACE_ATOM)).toBe(before);
  expect(mocks.write).not.toHaveBeenCalled();
  expect(mocks.remove).not.toHaveBeenCalled();
  expect(mocks.removeFile).not.toHaveBeenCalled();
});
it('removes a save-state module after the warning is confirmed', async () => {
  const fixes = saveStateModule('Fixes', 'optional');
  setup([applied, files, independent, fixes]);
  await uninstallContentButtonCallback([content(fixes)], []);
  expect(saveStateDialog()).toBeDefined();
  expect(mocks.removeFile.mock.calls[0][0]).toContain(
    'ucp/modules/Fixes-1.0.0.zip',
  );
});
it('revalidates after the save-state warning instead of overwriting newer choices', async () => {
  const tunnelers = saveStateModule('Tunnelers', 'required');
  setup(
    [applied, files, independent, tunnelers],
    [applied, files, independent, tunnelers],
    [applied, independent, tunnelers],
  );
  mocks.confirm.mockImplementation(
    async (spec: Partial<OkCancelModalWindowProperties>) => {
      if (spec.title === SAVE_STATE_TITLE)
        getStore().set(CONFIGURATION_USER_REDUCER_ATOM, {
          type: 'reset',
          value: { 'Independent.option': 99 },
        });
      return true;
    },
  );
  await uninstallContentButtonCallback([content(tunnelers)], []);
  expect(saveStateDialog()).toBeDefined();
  expect(mocks.write).not.toHaveBeenCalled();
  expect(mocks.removeFile).not.toHaveBeenCalled();
  expect(
    getStore().get(CONFIGURATION_USER_REDUCER_ATOM)['Independent.option'],
  ).toBe(99);
});
