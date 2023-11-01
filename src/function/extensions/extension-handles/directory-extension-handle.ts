import { onFsExists, readBinaryFile, readTextFile } from 'tauri/tauri-files';
import ExtensionHandle from './extension-handle';

class DirectoryExtensionHandle implements ExtensionHandle {
  path: string;

  constructor(path: string) {
    this.path = path;
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