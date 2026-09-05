/* eslint-disable max-classes-per-file */
import { beforeEach, expect, it, vi } from 'vitest';
import { installUCPFromZip } from './install-ucp-from-zip';

const mocks = vi.hoisted(() => ({
  exists: vi.fn(),
  update: vi.fn(),
  extract: vi.fn(),
  activate: vi.fn(),
}));
vi.mock('@tauri-apps/api/fs', () => ({ exists: mocks.exists }));
vi.mock('./update-bundled-extensions', () => ({
  BundledUpdateRollbackError: class extends Error {},
  updateBundledExtensions: mocks.update,
}));
vi.mock('../../tauri/tauri-invoke', () => ({
  extractZipToPath: mocks.extract,
}));
vi.mock('../../util/scripts/logging', () => ({
  default: class {
    msg() {
      return this;
    }

    warn() {
      return this;
    }

    error() {
      return this;
    }
  },
}));
vi.mock('../../hooks/jotai/base', () => ({
  getStore: () => ({ set: vi.fn() }),
}));
vi.mock('../ucp-files/ucp-state', () => ({ UCP_FILES_STATE_ATOM: {} }));
vi.mock('../ucp-files/create-real-bink', () => ({
  createRealBink: async () => ({ throwIfErr() {} }),
}));
vi.mock('../ucp-files/activate-ucp', () => ({ activateUCP: mocks.activate }));
vi.mock('../ucp-files/ucp-version', () => ({
  initializeUCPVersion: async () => ({ status: 'ok', version: {} }),
}));
beforeEach(() => {
  vi.resetAllMocks();
  mocks.exists.mockResolvedValue(false);
  mocks.activate.mockResolvedValue({ throwIfErr() {} });
});
it('updates fresh installs before activation', async () => {
  expect(
    (await installUCPFromZip('framework.zip', 'D:/game', vi.fn())).isOk(),
  ).toBe(true);
  expect(mocks.update).toHaveBeenCalledWith('D:/game', {});
  expect(mocks.extract.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.update.mock.invocationCallOrder[0],
  );
  expect(mocks.update.mock.invocationCallOrder[0]).toBeLessThan(
    mocks.activate.mock.invocationCallOrder[0],
  );
});
it.each(['D:/game/ucp', 'D:/game/ucp-config.yml'])(
  'preserves existing installs/configurations (%s)',
  async (path) => {
    mocks.exists.mockImplementation(async (p) => p === path);
    await installUCPFromZip('framework.zip', 'D:/game', vi.fn());
    expect(mocks.update).not.toHaveBeenCalled();
  },
);
it('completes installation with bundled versions when offline', async () => {
  mocks.update.mockRejectedValue(new Error('offline'));
  expect(
    (await installUCPFromZip('framework.zip', 'D:/game', vi.fn())).isOk(),
  ).toBe(true);
  expect(mocks.activate).toHaveBeenCalled();
});
