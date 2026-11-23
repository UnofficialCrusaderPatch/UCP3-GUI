import { beforeEach, expect, it, vi } from 'vitest';
import { Range } from 'semver';
import { updateBundledExtensions } from './update-bundled-extensions';
import { UCPVersion } from '../ucp-files/ucp-version';

const mocks = vi.hoisted(() => ({
  fetch: vi.fn(),
  install: vi.fn(),
  removeFile: vi.fn(),
  removeDir: vi.fn(),
  plan: vi.fn(),
  discover: vi.fn(),
  gui: vi.fn(),
  exists: vi.fn(),
}));
vi.mock('@tauri-apps/api/app', () => ({ getVersion: mocks.gui }));
vi.mock('@tauri-apps/api/fs', () => ({ exists: mocks.exists }));
vi.mock('../content/store/fetch', () => ({ fetchStore: mocks.fetch }));
vi.mock('./plan-bundled-updates', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  planBundledUpdates: mocks.plan,
}));
vi.mock('../extensions/discovery/discovery', () => ({
  discoverExtensions: mocks.discover,
}));
vi.mock(
  '../../components/ucp-tabs/content-manager/buttons/callbacks/install-content',
  () => ({ installOnlineContent: mocks.install }),
);
vi.mock('../../tauri/tauri-files', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  removeFile: mocks.removeFile,
  removeDir: mocks.removeDir,
}));
const version = {
  getBuildRepresentation: () => 'Release',
  getMajorMinorPatchAsString: () => '3.0.7',
} as UCPVersion;
const plan = [
  {
    definition: {
      name: 'aiSwapper',
      version: '1.3.0',
      type: 'module',
      dependencies: {},
    },
  },
];
const installed = (
  name: string,
  extensionVersion: string,
  dependencies: Record<string, string> = {},
  type = 'module',
  extra: object = {},
) => ({
  name,
  version: extensionVersion,
  type,
  definition: {
    name,
    version: extensionVersion,
    dependencies: Object.fromEntries(
      Object.entries(dependencies).map(([n, range]) => [n, new Range(range)]),
    ),
  },
  configEntries: {},
  ...extra,
});
const original = installed('aiSwapper', '1.1.0');
const replacement = installed('aiSwapper', '1.3.0');
// What discovery finds before and after the downloads
const discovers = (before: object[], after: object[]) =>
  mocks.discover
    .mockReset()
    .mockResolvedValueOnce(before)
    .mockResolvedValue([...before, ...after]);
const SETUP_DEPENDENCIES = {
  'ucp3-basics': '^1.0.0',
  frontend: '>=1.0.17 <2.0.0',
};
const planned = (name: string, dependencies: Record<string, string>) => ({
  definition: { name, version: '1.0.0', type: 'plugin', dependencies },
});
const NEW_VERSION_REMOVED = [
  ['D:/game/ucp/modules/aiSwapper-1.3.0.zip', true],
  ['D:/game/ucp/modules/aiSwapper-1.3.0.zip.sig', true],
];
beforeEach(() => {
  vi.resetAllMocks();
  discovers([], [replacement]);
  mocks.fetch.mockResolvedValue({});
  mocks.plan.mockReturnValue(plan);
  mocks.install.mockResolvedValue([{ status: 'ok' }]);
  mocks.removeFile.mockResolvedValue({ getOrThrow: () => undefined });
  mocks.removeDir.mockResolvedValue({ getOrThrow: () => undefined });
  mocks.gui.mockResolvedValue('1.0.15');
  mocks.exists.mockResolvedValue(false);
});
it('uses the installed framework catalog and explicit game folder', async () => {
  await updateBundledExtensions('D:/game', version);
  expect(mocks.fetch).toHaveBeenCalledWith({ queryKey: ['store', '3.0.7'] });
  expect(mocks.plan).toHaveBeenCalledWith(
    [],
    {},
    '1.0.15',
    '3.0.7',
    'ucp3-basics-fixes',
  );
  expect(mocks.install).toHaveBeenCalledWith(plan, undefined, 'D:/game');
  expect(mocks.removeFile).not.toHaveBeenCalled();
  expect(mocks.discover.mock.calls).toEqual([
    ['D:/game', 'Release'],
    ['D:/game', 'Release'],
  ]);
});
it('leaves bundled files untouched when the Store is offline', async () => {
  mocks.fetch.mockRejectedValue(new Error('offline'));
  await expect(updateBundledExtensions('D:/game', version)).rejects.toThrow(
    'offline',
  );
  expect(mocks.install).not.toHaveBeenCalled();
  expect(mocks.removeFile).not.toHaveBeenCalled();
});
it('removes superseded bundles only after all updates succeed', async () => {
  discovers([original, installed('files', '1.3.0')], [replacement]);
  await updateBundledExtensions('D:/game', version);
  expect(mocks.removeFile.mock.calls).toEqual([
    ['D:/game/ucp/modules/aiSwapper-1.1.0.zip', true],
    ['D:/game/ucp/modules/aiSwapper-1.1.0.zip.sig', true],
  ]);
  expect(mocks.discover.mock.invocationCallOrder[1]).toBeLessThan(
    mocks.removeFile.mock.invocationCallOrder[0],
  );
});
it('keeps the bundled originals when a profile appeared before pruning', async () => {
  discovers([original, installed('files', '1.3.0')], [replacement]);
  mocks.exists.mockImplementation(
    async (path) => path === 'D:/game/ucp-config.yml',
  );
  await updateBundledExtensions('D:/game', version);
  expect(mocks.install).toHaveBeenCalled();
  expect(mocks.removeFile).not.toHaveBeenCalled();
  expect(mocks.removeDir).not.toHaveBeenCalled();
});
it('removes only the new versions after a partial installation failure', async () => {
  discovers([original], []);
  mocks.plan.mockReturnValue([
    ...plan,
    planned('ucp3-basics-fixes', SETUP_DEPENDENCIES),
  ]);
  mocks.install.mockResolvedValue([{ status: 'ok' }, { status: 'error' }]);
  await expect(updateBundledExtensions('D:/game', version)).rejects.toThrow(
    'Could not install',
  );
  expect(mocks.removeFile.mock.calls).toEqual(NEW_VERSION_REMOVED);
  expect(mocks.removeDir.mock.calls).toEqual([
    ['D:/game/ucp/plugins/ucp3-basics-fixes-1.0.0', true, true],
  ]);
});
it.each([
  ['malformed or missing definition', []],
  ['wrong version', [installed('aiSwapper', '1.2.0')]],
  ['wrong type', [{ ...replacement, type: 'plugin' }]],
  [
    'different packaged dependencies',
    [installed('aiSwapper', '1.3.0', { missing: '^1.0.0' })],
  ],
])(
  'rolls back a successful download with %s before pruning',
  async (_, replacements) => {
    discovers([original], replacements);
    await expect(updateBundledExtensions('D:/game', version)).rejects.toThrow(
      /Installed/,
    );
    expect(mocks.removeFile.mock.calls).toEqual(NEW_VERSION_REMOVED);
  },
);
it('validates compatibility with surviving bundled plugins before pruning', async () => {
  discovers(
    [original, installed('preset', '1.0.0', { aiSwapper: '<1.3.0' })],
    [replacement],
  );
  await expect(updateBundledExtensions('D:/game', version)).rejects.toThrow(
    'incompatible',
  );
  expect(mocks.removeFile.mock.calls).toEqual(NEW_VERSION_REMOVED);
});
it.each([
  [
    'installation',
    () => mocks.install.mockResolvedValue([{ status: 'error' }]),
  ],
  ['validation', () => discovers([], [])],
])(
  'reports a failed cleanup after a failed %s instead of falling back',
  async (_, arrange) => {
    arrange();
    mocks.removeFile.mockRejectedValue(new Error('access denied'));
    await expect(updateBundledExtensions('D:/game', version)).rejects.toThrow(
      'Could not restore bundled extensions',
    );
  },
);

// A setup whose first-use activation fails although validation passes
it.each([
  [
    'a stale sparse load-order entry',
    {
      config: {
        'config-sparse': {
          'load-order': [{ extension: 'stale-extension', version: '1.0.0' }],
        },
      },
    },
    'stale-extension',
  ],
  [
    'a configuration error',
    {
      configEntries: {
        'files.option': { contents: { 'required-value': false } },
      },
    },
    'Configuration errors',
  ],
])('rolls back a downloaded setup with %s', async (_, broken, reason) => {
  mocks.gui.mockResolvedValue('1.0.17');
  mocks.plan.mockReturnValue([
    planned('ucp3-basics-fixes', SETUP_DEPENDENCIES),
    planned('ucp3-basics', { files: '^1.0.0' }),
  ]);
  mocks.install.mockResolvedValue([{ status: 'ok' }, { status: 'ok' }]);
  discovers(
    [installed('files', '1.3.0')],
    [
      installed(
        'ucp3-basics-fixes',
        '1.0.0',
        SETUP_DEPENDENCIES,
        'plugin',
        broken,
      ),
      installed('ucp3-basics', '1.0.0', { files: '^1.0.0' }, 'plugin', {
        configEntries: {
          'files.option': { contents: { 'required-value': true } },
        },
      }),
    ],
  );
  await expect(updateBundledExtensions('D:/game', version)).rejects.toThrow(
    reason,
  );
  expect(mocks.removeDir.mock.calls).toEqual([
    ['D:/game/ucp/plugins/ucp3-basics-fixes-1.0.0', true, true],
    ['D:/game/ucp/plugins/ucp3-basics-1.0.0', true, true],
  ]);
  expect(mocks.removeFile).not.toHaveBeenCalled();
});
