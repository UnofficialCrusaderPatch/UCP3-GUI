import { beforeEach, expect, it, vi } from 'vitest';
import { planBundledUpdates } from './plan-bundled-updates';
import { downloadAndInstallContent } from '../../components/ucp-tabs/content-manager/buttons/callbacks/install-content';
import { Extension } from '../../config/ucp/common';
import { ContentStore } from '../content/store/fetch';

const mocks = vi.hoisted(() => ({
  download: vi.fn(),
  hash: vi.fn(),
  install: vi.fn(),
}));
vi.mock('../../tauri/tauri-http', () => ({ download: mocks.download }));
vi.mock('../../util/scripts/hash', () => ({ getHexHashOfFile: mocks.hash }));
vi.mock('../extensions/installation/install-module', () => ({
  installModule: mocks.install,
  installPlugin: vi.fn(),
}));
vi.mock('../../tauri/tauri-files', () => ({
  removeFile: async () => ({ isErr: () => false }),
  onFsExists: vi.fn(),
}));
vi.mock(
  '../../components/ucp-tabs/content-manager/buttons/callbacks/status',
  () => ({ createStatusSetter: () => vi.fn() }),
);
vi.mock('../../components/modals/modal-ok', () => ({ showModalOk: vi.fn() }));
vi.mock('../game-folder/interface', () => ({ GAME_FOLDER_ATOM: {} }));

const bundled = [
  { name: 'example', version: '1.0.0', definition: { dependencies: {} } },
] as Extension[];
const store = {
  framework: { version: '=3.0.7' },
  frontend: { version: '>=1.0.0' },
  extensions: {
    list: [
      {
        definition: {
          name: 'example',
          version: '1.1.0',
          type: 'module',
          dependencies: {},
        },
        contents: {
          package: [
            { method: 'github-binary', url: 'unsigned.zip', hash: 'first' },
            {
              method: 'github-binary',
              url: 'signed.zip',
              hash: 'second',
              signature: 'signature',
            },
          ],
        },
      },
    ],
  },
} as ContentStore;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.hash.mockResolvedValue('SECOND');
});

it('downloads, hashes and installs the signed source selected by the real planner', async () => {
  const plan = planBundledUpdates(bundled, store, '1.0.16', '3.0.7');
  expect(plan).toHaveLength(1);
  const result = await downloadAndInstallContent(plan[0], 'D:/target');
  expect(result.status).toBe('ok');
  expect(mocks.download).toHaveBeenCalledWith(
    'signed.zip',
    expect.stringContaining('D:/target/'),
    expect.any(Function),
  );
  expect(mocks.install).toHaveBeenCalledWith(
    'D:/target',
    expect.stringContaining('example-1.1.0.zip'),
    'signature',
  );
  expect(store.extensions.list[0].contents.package).toHaveLength(2);
  expect(store.extensions.list[0].contents.package[0].url).toBe('unsigned.zip');
});

it('rejects a payload matching the unselected source hash', async () => {
  mocks.hash.mockResolvedValue('first');
  const plan = planBundledUpdates(bundled, store, '1.0.16', '3.0.7');
  expect((await downloadAndInstallContent(plan[0], 'D:/target')).status).toBe(
    'error',
  );
  expect(mocks.install).not.toHaveBeenCalled();
});
