import { invoke } from '@tauri-apps/api/tauri';
import { Extension } from '../../config/ucp/common';
import { getStore } from '../../hooks/jotai/base';
import {
  ACTIVE_EXTENSIONS_FULL_ATOM,
  EXTENSIONS_ATOM,
} from '../../function/extensions/state/focus';
import { readDir, resolvePath } from '../../tauri/tauri-files';
import TextureCatalogCache from './texture-catalog-cache';

const manifestPath = 'resources/textures/manifest.json';
const cache = new TextureCatalogCache<Extension>({
  pack: async (extension) => {
    if (extension.type !== 'plugin' || !extension.io.isDirectory) return null;
    return extension.io.handle(async (handle) => {
      if (!(await handle.doesEntryExist(manifestPath))) return null;
      const manifest = JSON.parse(await handle.getTextContents(manifestPath));
      const entries = await handle.listEntries('', '**/*');
      const paths = entries.map((entry) => entry.path.replaceAll('\\', '/'));
      const manifestFile = paths.find((path) =>
        path.endsWith(`/${manifestPath}`),
      );
      if (!manifestFile)
        throw new Error(`Texture manifest missing: ${extension.name}`);
      return {
        name: extension.name,
        root: manifestFile.slice(0, -manifestPath.length - 1),
        paths,
        manifest,
      };
    });
  },
  gameFiles: async (folder) => {
    const entries = (
      await readDir(await resolvePath(folder, 'gm'))
    ).getOrThrow();
    return entries
      .filter((entry) => entry.name?.toLowerCase().endsWith('.gm1'))
      .map((entry) => `gm/${entry.name}`);
  },
  metadata: async (folder, path) => {
    const result = await invoke<{
      count: number;
      kind: number;
      palette: number[];
    }>('read_gm1_metadata', { path: await resolvePath(folder, path) });
    return {
      count: result.count,
      kind: result.kind,
      palette: result.palette.length
        ? btoa(String.fromCharCode(...result.palette))
        : undefined,
    };
  },
});

export function prepareTextureCatalog(
  folder: string,
  discovery: unknown,
  extensions: Extension[],
) {
  return cache.prepare(folder, discovery, extensions);
}

export function createGetTextureCatalogInputsFunction(folder: string) {
  return () =>
    prepareTextureCatalog(
      folder,
      getStore().get(EXTENSIONS_ATOM),
      getStore().get(ACTIVE_EXTENSIONS_FULL_ATOM),
    );
}
