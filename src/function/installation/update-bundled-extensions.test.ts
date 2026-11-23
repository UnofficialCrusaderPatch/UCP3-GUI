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
}));
vi.mock('@tauri-apps/api/app', () => ({ getVersion: async () => '1.0.15' }));
vi.mock('../content/store/fetch', () => ({ fetchStore: mocks.fetch }));
vi.mock('./plan-bundled-updates', () => ({ planBundledUpdates: mocks.plan }));
vi.mock('../extensions/discovery/discovery', () => ({
  discoverExtensions: mocks.discover,
}));
vi.mock(
  '../../components/ucp-tabs/content-manager/buttons/callbacks/install-content',
  () => ({ installOnlineContent: mocks.install }),
);
vi.mock('../../tauri/tauri-files', () => ({
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
) => ({
  name,
  version: extensionVersion,
  type: 'module',
  definition: {
    dependencies: Object.fromEntries(
      Object.entries(dependencies).map(([n, range]) => [n, new Range(range)]),
    ),
  },
});
const original = installed('aiSwapper', '1.1.0');
const replacement = installed('aiSwapper', '1.3.0');
// What discovery finds before and after the downloads
const discovers = (before: object[], after: object[]) =>
  mocks.discover
    .mockReset()
    .mockResolvedValueOnce(before)
    .mockResolvedValue([...before, ...after]);
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
});
it('uses the installed framework catalog and explicit game folder', async () => {
  await updateBundledExtensions('D:/game', version);
  expect(mocks.fetch).toHaveBeenCalledWith({ queryKey: ['store', '3.0.7'] });
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
it('removes only the new versions after a partial installation failure', async () => {
  discovers([original], []);
  mocks.install.mockResolvedValue([{ status: 'error' }]);
  await expect(updateBundledExtensions('D:/game', version)).rejects.toThrow(
    'Could not install',
  );
  expect(mocks.removeFile.mock.calls).toEqual(NEW_VERSION_REMOVED);
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
