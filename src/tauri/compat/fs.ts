// v1: '@tauri-apps/api/fs'
import {
  BaseDirectory,
  copyFile as v2CopyFile,
  exists as v2Exists,
  mkdir,
  readDir as v2ReadDir,
  readFile,
  readTextFile as v2ReadTextFile,
  remove,
  rename,
  stat,
  writeFile,
  writeTextFile as v2WriteTextFile,
} from '@tauri-apps/plugin-fs';
import { join } from '@tauri-apps/api/path';

export { BaseDirectory };

export interface FsOptions {
  dir?: BaseDirectory;
}

export interface FsDirOptions {
  dir?: BaseDirectory;
  recursive?: boolean;
}

/** v1 directory entry: `children` is set (possibly empty) only for directories. */
export interface FileEntry {
  path: string;
  name?: string;
  children?: FileEntry[];
}

export type BinaryFileContents =
  | Iterable<number>
  | ArrayLike<number>
  | ArrayBuffer;

const toBytes = (contents: BinaryFileContents): Uint8Array => {
  if (contents instanceof Uint8Array) return contents;
  if (contents instanceof ArrayBuffer) return new Uint8Array(contents);
  return Uint8Array.from(contents as Iterable<number>);
};

const base = (options?: FsOptions) =>
  options?.dir === undefined ? undefined : { baseDir: options.dir };

export async function exists(path: string, options?: FsOptions) {
  return v2Exists(path, base(options));
}

export async function createDir(path: string, options?: FsDirOptions) {
  return mkdir(path, { ...base(options), recursive: options?.recursive });
}

export async function removeDir(path: string, options?: FsDirOptions) {
  return remove(path, { ...base(options), recursive: options?.recursive });
}

export async function removeFile(path: string, options?: FsOptions) {
  return remove(path, base(options));
}

export async function readTextFile(path: string, options?: FsOptions) {
  return v2ReadTextFile(path, base(options));
}

export async function readBinaryFile(path: string, options?: FsOptions) {
  return readFile(path, base(options));
}

export async function writeTextFile(
  path: string,
  contents: string,
  options?: FsOptions,
) {
  return v2WriteTextFile(path, contents, base(options));
}

export async function writeBinaryFile(
  path: string,
  contents: BinaryFileContents,
  options?: FsOptions,
) {
  return writeFile(path, toBytes(contents), base(options));
}

export async function copyFile(
  source: string,
  destination: string,
  options?: FsOptions,
) {
  return v2CopyFile(source, destination, {
    fromPathBaseDir: options?.dir,
    toPathBaseDir: options?.dir,
  });
}

export async function renameFile(
  oldPath: string,
  newPath: string,
  options?: FsOptions,
) {
  return rename(oldPath, newPath, {
    oldPathBaseDir: options?.dir,
    newPathBaseDir: options?.dir,
  });
}

/**
 * v1 `readDir`: returns full paths, optionally recursive, and (like v1)
 * follows symlinks when deciding whether an entry is a directory.
 */
export async function readDir(
  dir: string,
  options?: FsDirOptions,
): Promise<FileEntry[]> {
  const entries = await v2ReadDir(dir, base(options));
  return Promise.all(
    entries.map(async (entry): Promise<FileEntry> => {
      const path = await join(dir, entry.name);
      let { isDirectory } = entry;
      if (entry.isSymlink) {
        try {
          isDirectory = (await stat(path, base(options))).isDirectory;
        } catch {
          isDirectory = false; // dangling link
        }
      }
      if (!isDirectory) return { path, name: entry.name };
      return {
        path,
        name: entry.name,
        children: options?.recursive ? await readDir(path, options) : [],
      };
    }),
  );
}
