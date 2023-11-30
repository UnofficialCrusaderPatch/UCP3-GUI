/* eslint-disable max-classes-per-file */
import { ZipReader } from 'util/structs/zip-handler';
import Logger from 'util/scripts/logging';
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

class RustZipExtensionHandle implements ExtensionHandle {
  #zip: ZipReader;

  path: string;

  private constructor(path: string, zip: ZipReader) {
    this.path = path;
    this.#zip = zip;
  }

  static async fromPath(path: string) {
    return new RustZipExtensionHandle(path, await ZipReader.open(path));
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
    globPattern: string | undefined,
  ): Promise<ExtensionFileHandle[]> {
    const entries = await this.#zip.getEntryNames(globPattern);

    const directories: Record<string, boolean> = {};

    entries.forEach((entry: string) => {
      const parts = entry.split('/');
      if (parts.length > 1) {
        const part = `${parts.slice(0, -1).join('/')}/`;
        if (directories[part] === false) {
          const msg = `Error while listing entries of ${this.path}. Path ${entry} cannot both be a file and a directory`;
          LOGGER.msg(msg).error();
          throw Error(msg);
        }
        directories[part] = true;
      }
    });

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
