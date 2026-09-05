import { beforeEach, expect, it, vi } from 'vitest';
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
  { definition: { name: 'aiSwapper', version: '1.3.0', type: 'module' } },
];
beforeEach(() => {
  vi.resetAllMocks();
  mocks.discover.mockResolvedValue([]);
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
});
it('leaves bundled files untouched when the Store is offline', async () => {
  mocks.fetch.mockRejectedValue(new Error('offline'));
  await expect(updateBundledExtensions('D:/game', version)).rejects.toThrow(
    'offline',
  );
  expect(mocks.install).not.toHaveBeenCalled();
  expect(mocks.removeFile).not.toHaveBeenCalled();
});
it('rolls back newly introduced versions after a partial installation failure', async () => {
  mocks.install.mockResolvedValue([{ status: 'error' }]);
  await expect(updateBundledExtensions('D:/game', version)).rejects.toThrow(
    'Could not install',
  );
  expect(mocks.removeFile.mock.calls).toEqual([
    ['D:/game/ucp/modules/aiSwapper-1.3.0.zip', true],
    ['D:/game/ucp/modules/aiSwapper-1.3.0.zip.sig', true],
  ]);
});
it('reports rollback failures instead of claiming a working offline fallback', async () => {
  mocks.install.mockResolvedValue([{ status: 'error' }]);
  mocks.removeFile.mockRejectedValue(new Error('access denied'));
  await expect(updateBundledExtensions('D:/game', version)).rejects.toThrow(
    'Could not restore bundled extensions',
  );
});

it('removes superseded bundles only after all updates succeed', async () => {
  mocks.discover.mockResolvedValue([
    { name: 'aiSwapper', version: '1.1.0', type: 'module' },
    { name: 'files', version: '1.3.0', type: 'module' },
  ]);
  await updateBundledExtensions('D:/game', version);
  expect(mocks.removeFile.mock.calls).toEqual([
    ['D:/game/ucp/modules/aiSwapper-1.1.0.zip', true],
    ['D:/game/ucp/modules/aiSwapper-1.1.0.zip.sig', true],
  ]);
  expect(mocks.install.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.removeFile.mock.invocationCallOrder[0],
  );
});
it('keeps old bundles when a replacement fails', async () => {
  mocks.discover.mockResolvedValue([
    { name: 'aiSwapper', version: '1.1.0', type: 'module' },
  ]);
  mocks.install.mockResolvedValue([{ status: 'error' }]);
  await expect(updateBundledExtensions('D:/game', version)).rejects.toThrow();
  expect(
    mocks.removeFile.mock.calls.every(([path]) => !path.includes('1.1.0')),
  ).toBe(true);
});
