/* eslint-disable max-classes-per-file */
import { beforeEach, expect, it, vi } from 'vitest';
import { installUCPFromZip } from './install-ucp-from-zip';
import { BundledUpdateRollbackError } from './update-bundled-extensions';

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
const install = () => installUCPFromZip('framework.zip', 'D:/game', vi.fn());
beforeEach(() => {
  vi.resetAllMocks();
  mocks.exists.mockResolvedValue(false);
  mocks.activate.mockResolvedValue({ throwIfErr() {} });
});
it.each([
  ['with Store updates', () => {}],
  [
    'with the bundled versions when offline',
    () => mocks.update.mockRejectedValue(new Error('offline')),
  ],
])('updates a fresh install, then activates it %s', async (_, arrange) => {
  arrange();
  expect((await install()).isOk()).toBe(true);
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
    await install();
    expect(mocks.update).not.toHaveBeenCalled();
  },
);
it('does not activate an installation whose bundled update could not be rolled back', async () => {
  mocks.update.mockRejectedValue(
    new BundledUpdateRollbackError('access denied'),
  );
  expect((await install()).isErr()).toBe(true);
  expect(mocks.activate).not.toHaveBeenCalled();
});
