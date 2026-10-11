import { describe, expect, it, vi } from 'vitest';
import { createGetBinaryFileFunction } from './sandbox-menu-functions';
import { readBinaryFile, resolvePath } from '../../tauri/tauri-files';
import Result from '../../util/structs/result';

vi.mock('../../tauri/tauri-files', () => ({
  readBinaryFile: vi.fn(),
  readTextFile: vi.fn(),
  receiveAssetUrl: vi.fn(),
  resolvePath: vi.fn(
    async (folder: string, path: string) => `${folder}/${path}`,
  ),
}));

describe('sandbox binary texture assets', () => {
  it('preserves every byte across the RPC base64 representation, including chunk boundaries', async () => {
    const bytes = Uint8Array.from({ length: 100003 }, (_, i) => i % 256);
    vi.mocked(readBinaryFile).mockResolvedValue(Result.ok(bytes));
    const encoded =
      await createGetBinaryFileFunction('D:/Game')('gm/tile_castle.gm1');
    expect(Uint8Array.from(atob(encoded), (c) => c.charCodeAt(0))).toEqual(
      bytes,
    );
    expect(resolvePath).toHaveBeenCalledWith('D:/Game', 'gm/tile_castle.gm1');
  });
  it.each([
    '../outside',
    'gm/../../outside',
    'D:/outside',
    '/outside',
    '\\\\server\\file',
  ])('rejects an asset path outside the game: %s', async (path) => {
    await expect(createGetBinaryFileFunction('D:/Game')(path)).rejects.toThrow(
      'inside the game folder',
    );
  });
  it('reports unreadable assets', async () => {
    vi.mocked(readBinaryFile).mockResolvedValue(
      Result.err(new Error('Missing')),
    );
    await expect(
      createGetBinaryFileFunction('D:/Game')('gm/missing.gm1'),
    ).rejects.toThrow('Cannot read binary asset');
  });
});
