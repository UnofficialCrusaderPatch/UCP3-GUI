/* eslint-disable max-classes-per-file */
import {
  onFsExists,
  readBinaryFile,
  readDir,
  readTextFile,
} from 'tauri/tauri-files';
import { FileEntry } from '@tauri-apps/api/fs';
import { readAndFilterPaths } from 'tauri/tauri-invoke';
import { ExtensionFileHandle, ExtensionHandle } from './extension-handle';
import { globToRegExp } from './glob';

class DirectoryExtensionFileHandle implements ExtensionFileHandle {
  path: string;

  extensionHandle: ExtensionHandle;

  isDirectory: boolean;

  constructor(
    eh: DirectoryExtensionHandle,
    path: string,
    isDirectory: boolean,
  ) {
    this.path = path;
    this.extensionHandle = eh;
    this.isDirectory = isDirectory;
  }

  getTextContents(): Promise<string> {
    return this.extensionHandle.getTextContents(this.path);
  }

  getBinaryContents(): Promise<Uint8Array> {
    return this.extensionHandle.getBinaryContents(this.path);
  }
}

const standardizePath = (path: string) => path.replaceAll(/\\+/g, '/');

const relativizePath = (basePath: string, fullPath: string) => {
  const relPathA = standardizePath(fullPath).split(
    standardizePath(basePath),
    2,
  )[1];
  let i = 0;
  while (
    relPathA.slice(i).startsWith('/') ||
    relPathA.slice(i).startsWith('\\')
  ) {
    i += 1;
  }
  return relPathA.slice(i);
};

const collectFileEntries = (basePath: string, fileEntries: FileEntry[]) => {
  const allFileEntries: FileEntry[] = [];

  const recursive = (fileEntry: FileEntry) => {
    if (fileEntry.children !== undefined && fileEntry.children !== null) {
      allFileEntries.push({
        ...fileEntry,
        path: `${relativizePath(basePath, fileEntry.path)}/`,
      } as FileEntry);

      fileEntry.children.forEach((childEntry) => recursive(childEntry));
    } else {
      allFileEntries.push({
        ...fileEntry,
        path: relativizePath(basePath, fileEntry.path),
      } as FileEntry);
    }
  };

  fileEntries.forEach((fileEntry: FileEntry) => recursive(fileEntry));

  return allFileEntries;
};

class DirectoryExtensionHandle implements ExtensionHandle {
  path: string;

  constructor(path: string) {
    this.path = path;
  }

  async clone() {
    return new DirectoryExtensionHandle(this.path);
  }

  async listEntries(
    basePath: string,
    globPattern?: string | undefined,
  ): Promise<ExtensionFileHandle[]> {
    // new code, half implemented
    const path = `${this.path}/${basePath}`;
    const r = await readAndFilterPaths(path, globPattern);

    const isDirectory = path.endsWith('/');

    // This hack is here to acommodate symlink situations
    const makeRelative = (p: string) => `ucp/${p.split('/ucp/', 2)[1]}`;

    return r.map(
      (p: string) =>
        new DirectoryExtensionFileHandle(
          this,
          // This hack is here to acommodate symlink situations
          makeRelative(p),
          isDirectory,
        ),
    );
  }

  async doesEntryExist(path: string): Promise<boolean> {
    const p = `${this.path}/${path}`;
    return onFsExists(p);
  }

  async getTextContents(path: string): Promise<string> {
    const p = `${this.path}/${path}`;
    if (await onFsExists(p)) {
      return (await readTextFile(p))
        .mapErr((error) => new Error(`Error while reading text file: ${error}`))
        .getOrThrow();
    }
    throw new Error(`${p} not found`);
  }

  async getBinaryContents(path: string): Promise<Uint8Array> {
    const p = `${this.path}/${path}`;
    if (await onFsExists(p)) {
      const result = await readBinaryFile(p);
      result.err().ifPresent((error) => {
        throw new Error(
          `Error while reading binary file: ${p}. Error: ${error}`,
        );
      });
      const array = result.ok().get();
      if (array instanceof Uint8Array) {
        return array;
      }
      throw new Error(`${p} contents is unexpected type`);
    }
    throw new Error(`${p} not found`);
  }

  // eslint-disable-next-line class-methods-use-this
  async close(): Promise<void> {
    return undefined;
  }
}

export default DirectoryExtensionHandle;