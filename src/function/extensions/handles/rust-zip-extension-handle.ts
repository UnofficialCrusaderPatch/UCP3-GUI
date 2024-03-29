/* eslint-disable max-classes-per-file */
import { slashify } from '../../../tauri/tauri-invoke';
import { ZipReader } from '../../../util/structs/zip-handler';
import Logger from '../../../util/scripts/logging';
import { ExtensionFileHandle, ExtensionHandle } from './extension-handle';

const LOGGER = new Logger('zip-extension-handle.ts');

class RustZipExtensionFileHandle implements ExtensionFileHandle {
  path: string;

  extensionHandle: ExtensionHandle;

  isDirectory: boolean;

  constructor(eh: RustZipExtensionHandle, path: string, isDirectory: boolean) {
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

const detectDirectories = (entries: string[]) => {
  const directories: Record<string, boolean> = {};
  entries.forEach((entry: string) => {
    const parts = entry.split('/');
    if (parts.length > 1) {
      const part = `${parts.slice(0, -1).join('/')}/`;
      if (directories[part] === false) {
        const msg = `Error while listing entries. Path ${entry} cannot both be a file and a directory`;
        LOGGER.msg(msg).error();
        throw Error(msg);
      }
      directories[part] = true;
    }
  });

  return directories;
};

class RustZipExtensionHandle implements ExtensionHandle {
  #zip: ZipReader;

  path: string;

  private constructor(path: string, zip: ZipReader) {
    this.path = path;
    this.#zip = zip;
  }

  async clone() {
    return RustZipExtensionHandle.fromPath(this.path);
  }

  static async fromPath(path: string) {
    return new RustZipExtensionHandle(path, await ZipReader.open(path));
  }

  static async with(path: string, cb: (eh: RustZipExtensionHandle) => void) {
    const handle = new RustZipExtensionHandle(path, await ZipReader.open(path));
    try {
      await cb(handle);
    } finally {
      handle.close();
    }
  }

  async getTextContents(path: string): Promise<string> {
    if (!(await this.doesEntryExist(path))) {
      throw Error(`/File does not exist: ${path}`);
    }
    return this.#zip.getEntryAsText(path);
  }

  async getBinaryContents(path: string): Promise<Uint8Array> {
    if (!(await this.doesEntryExist(path))) {
      throw Error(`/File does not exist: ${path}`);
    }
    return this.#zip.getEntryAsBinary(path);
  }

  async doesEntryExist(path: string): Promise<boolean> {
    return this.#zip.doesEntryExist(path);
  }

  async close(): Promise<void> {
    return this.#zip.close();
  }

  async listEntries(
    basePath: string,
    globPattern: string | undefined,
  ): Promise<ExtensionFileHandle[]> {
    const entries = await this.#zip.getEntryNames(
      await slashify(`${basePath}/${globPattern || ''}`),
    );

    const directories: Record<string, boolean> = detectDirectories(entries);

    return entries.map(
      (entry: string) =>
        new RustZipExtensionFileHandle(
          this,
          entry,
          directories[entry] === true,
        ),
    );
  }
}

export default RustZipExtensionHandle;
