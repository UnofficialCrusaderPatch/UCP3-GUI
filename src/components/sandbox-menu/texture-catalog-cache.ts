export type TextureMetadata = { count: number; kind: number; palette?: string };
export type TexturePackInput = {
  name: string;
  root: string;
  paths: string[];
  manifest: unknown;
};

export type TextureCatalogInputs = {
  packs: TexturePackInput[];
  metadata: Record<string, TextureMetadata>;
};

type IO<E> = {
  pack: (extension: E) => Promise<TexturePackInput | null>;
  gameFiles: (folder: string) => Promise<string[]>;
  metadata: (folder: string, path: string) => Promise<TextureMetadata>;
};

/** Disposable derived asset data only. It never stores configuration or winners. */
export default class TextureCatalogCache<E extends object> {
  private scope?: {
    folder: string;
    discovery: unknown;
    packs: Map<E, Promise<TexturePackInput | null>>;
    metadata: Map<string, Promise<TextureMetadata>>;
    base?: Promise<void>;
  };

  private running = 0;

  private waiting: (() => void)[] = [];

  constructor(private io: IO<E>) {}

  private async limited<T>(task: () => Promise<T>): Promise<T> {
    if (this.running >= 4)
      await new Promise<void>((resolve) => {
        this.waiting.push(resolve);
      });
    else this.running += 1;
    try {
      return await task();
    } finally {
      const next = this.waiting.shift();
      if (next) next();
      else this.running -= 1;
    }
  }

  async prepare(
    folder: string,
    discovery: unknown,
    extensions: E[],
  ): Promise<TextureCatalogInputs> {
    if (
      !this.scope ||
      this.scope.folder !== folder ||
      this.scope.discovery !== discovery
    ) {
      this.scope = { folder, discovery, packs: new Map(), metadata: new Map() };
    }
    const { scope } = this;
    const read = (path: string) => {
      if (!scope.metadata.has(path)) {
        const pending = this.limited(() => this.io.metadata(folder, path));
        scope.metadata.set(path, pending);
        // Keep failures observable to the requesting menu, without unhandled
        // background rejections or repeated error dialogs.
        pending.catch(() => {});
      }
      return scope.metadata.get(path)!;
    };
    const packs = (
      await Promise.all(
        extensions.map((extension) => {
          if (!scope.packs.has(extension)) {
            scope.packs.set(
              extension,
              this.limited(() => this.io.pack(extension)),
            );
          }
          return scope.packs.get(extension)!;
        }),
      )
    ).filter((pack): pack is TexturePackInput => pack !== null);
    if (!packs.length) return { packs: [], metadata: {} };
    if (scope !== this.scope)
      throw new Error(
        'Texture content changed during preparation; reopen the menu.',
      );
    if (!scope.base) {
      scope.base = this.io.gameFiles(folder).then(async (paths) => {
        await Promise.all(paths.map(read));
        return undefined;
      });
      scope.base.catch(() => {});
    }
    const paths = [
      ...new Set(
        packs
          .flatMap((pack) => pack.paths)
          .filter((path) => path.toLowerCase().endsWith('.gm1')),
      ),
    ];
    await Promise.all([scope.base, ...paths.map(read)]);
    if (scope !== this.scope)
      throw new Error(
        'Texture content changed during preparation; reopen the menu.',
      );
    // Packs are supplied in the current Content order, even when cached. Removed
    // packs are absent; reactivation may reuse their immutable decoded metadata.
    const selected = new Set(paths);
    const metadata = Object.fromEntries(
      await Promise.all(
        [...scope.metadata.entries()]
          .filter(([path]) => selected.has(path) || path.startsWith('gm/'))
          .map(async ([path, result]) => [path, await result]),
      ),
    );
    return { packs, metadata };
  }
}
