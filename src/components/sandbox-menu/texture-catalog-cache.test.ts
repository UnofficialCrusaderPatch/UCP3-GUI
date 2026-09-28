import { describe, expect, it, vi } from 'vitest';
import TextureCatalogCache from './texture-catalog-cache';

function fixture() {
  const io = {
    pack: vi.fn(async (extension: { name: string }) => ({
      ...extension,
      root: extension.name,
      manifest: {},
      paths: [`${extension.name}/keep.gm1`],
    })),
    gameFiles: vi.fn(async () => ['gm/keep.gm1']),
    metadata: vi.fn(async () => ({ count: 2, kind: 3 })),
  };
  return {
    io,
    cache: new TextureCatalogCache(io),
    a: { name: 'Arabia' },
    b: { name: 'Winter' },
    discovery: {},
  };
}

describe('background texture catalog', () => {
  it('shares in-flight work with the menu and reopens without IO', async () => {
    const { io, cache, a, discovery } = fixture();
    const [background, menu] = await Promise.all([
      cache.prepare('game', discovery, [a]),
      cache.prepare('game', discovery, [a]),
    ]);
    expect(menu).toEqual(background);
    await cache.prepare('game', discovery, [a]);
    expect(io.pack).toHaveBeenCalledTimes(1);
    expect(io.gameFiles).toHaveBeenCalledTimes(1);
    expect(io.metadata).toHaveBeenCalledTimes(2);
  });
  it('adds only new assets and respects current Content order and removal', async () => {
    const { io, cache, a, b, discovery } = fixture();
    await cache.prepare('game', discovery, [a]);
    const both = await cache.prepare('game', discovery, [b, a]);
    expect(both.packs.map((pack) => pack.name)).toEqual(['Winter', 'Arabia']);
    const removed = await cache.prepare('game', discovery, [b]);
    expect(removed.packs.map((pack) => pack.name)).toEqual(['Winter']);
    expect(removed.metadata['Arabia/keep.gm1']).toBeUndefined();
    expect(io.metadata).toHaveBeenCalledTimes(3);
    await cache.prepare('game', discovery, [a, b]);
    expect(io.metadata).toHaveBeenCalledTimes(3);
  });
  it('invalidates on game-folder changes and content rediscovery', async () => {
    const { io, cache, a, discovery } = fixture();
    await cache.prepare('game', discovery, [a]);
    await cache.prepare('other', discovery, [a]);
    await cache.prepare('other', {}, [a]);
    expect(io.metadata).toHaveBeenCalledTimes(6);
  });
  it('rejects stale completion without replacing the current catalog', async () => {
    const { io, cache, a, discovery } = fixture();
    let release!: () => void;
    io.metadata.mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => {
        release = resolve;
      });
      return { count: 2, kind: 3 };
    });
    const pending = cache.prepare('old', discovery, [a]);
    const rejection = expect(pending).rejects.toThrow('changed');
    await vi.waitFor(() => expect(release).toBeTypeOf('function'));
    const current = await cache.prepare('new', discovery, [a]);
    release();
    await rejection;
    expect(await cache.prepare('new', discovery, [a])).toEqual(current);
  });
  it('retains a failed read for the menu and retries after Reload', async () => {
    const { io, cache, a, discovery } = fixture();
    io.metadata.mockRejectedValueOnce(new Error('Damaged GM1'));
    await expect(cache.prepare('game', discovery, [a])).rejects.toThrow(
      'Damaged GM1',
    );
    await expect(cache.prepare('game', discovery, [a])).rejects.toThrow(
      'Damaged GM1',
    );
    expect(io.metadata).toHaveBeenCalledTimes(2);
    await expect(cache.prepare('game', {}, [a])).resolves.toHaveProperty(
      'packs',
    );
  });
});
