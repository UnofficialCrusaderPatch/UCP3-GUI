import { readTextFile, readDir } from '@tauri-apps/api/fs';

import { proxyFsExists, readBinaryFile } from '../../renderer/utils/file-utils';
import ExtensionHandle from './ExtensionHandle';

class DirectoryExtensionHandle implements ExtensionHandle {
  path: string;

  constructor(path: string) {
    this.path = path;
  }

  async doesEntryExist(path: string): Promise<boolean> {
    const p = `${this.path}/${path}`;
    return proxyFsExists(p);
  }

  async getTextContents(path: string): Promise<string> {
    const p = `${this.path}/${path}`;
    if (await proxyFsExists(p)) {
      const result = await readTextFile(p);
      if (result === undefined) {
        throw new Error(`Error while reading text file: ${p}`);
      }
      return result;
    }
    throw new Error(`${p} not found`);
  }

  async getBinaryContents(path: string): Promise<Uint8Array> {
    const p = `${this.path}/${path}`;
    if (await proxyFsExists(p)) {
      const [result, error] = await readBinaryFile(p);
      if (error !== undefined) {
        throw new Error(
          `Error while reading binary file: ${p}. Error: ${error}`
        );
      }
      if (result instanceof Uint8Array) {
        return result;
      }
      throw new Error(`${p} contents is unexpected type`);
    }
    throw new Error(`${p} not found`);
  }
}

export default DirectoryExtensionHandle;
