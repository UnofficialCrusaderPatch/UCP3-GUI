import JSZip from 'jszip';
import ExtensionHandle from './ExtensionHandle';
import { readBinaryFile } from '../../renderer/utils/file-utils';

class JSZipExtensionHandle implements ExtensionHandle {
  zip: JSZip;

  path: string;

  constructor(path: string, zip: JSZip) {
    this.zip = zip;
    this.path = path;
  }

  static async fromPath(path: string) {
    // Do hash check here!
    const dataResult = await readBinaryFile(path);
    dataResult.err().ifPresent((error) => {
      throw new Error(`Could not read zip file: ${path}: ${error}`);
    });

    return dataResult
      .ok()
      .map(async (data) => {
        const zip = await JSZip.loadAsync(data as Uint8Array, {
          createFolders: false,
        });
        return new JSZipExtensionHandle(path, zip);
      })
      .get();
  }

  async doesEntryExist(path: string) {
    const f = this.zip.file(path);
    return f !== undefined && f !== null;
  }

  async getBinaryContents(path: string): Promise<Uint8Array> {
    const f = this.zip.file(path);
    if (f !== undefined && f !== null) {
      const result = await f.async<'uint8array'>('uint8array');
      if (result !== undefined) {
        return result;
      }
      throw new Error(`${path} contents is undefined`);
    }
    throw new Error(`${path} not found`);
  }

  async getTextContents(path: string) {
    const f = this.zip.file(path);
    if (f !== undefined && f !== null) {
      const result = await f.async<'string'>('string');
      if (result !== undefined) {
        return result;
      }
      throw new Error(`${path} contents is undefined`);
    }
    throw new Error(`${path} not found`);
  }
}

export default JSZipExtensionHandle;
