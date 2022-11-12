import {
  closeZip,
  existZipEntry,
  getZipEntryAsBinary,
  getZipEntryAsText,
  loadZip,
} from 'tauri/tauri-invoke';
import ExtensionHandle from './extension-handle';

const REGISTRY = new FinalizationRegistry((zipID: number) => {
  closeZip(zipID);
});

class RustZipExtensionHandle implements ExtensionHandle {
  path: string;

  zip: number;

  constructor(path: string, zip: number) {
    this.path = path;
    this.zip = zip;
    REGISTRY.register(this, this.zip);
  }

  static async fromPath(path: string) {
    return new RustZipExtensionHandle(path, await loadZip(path));
  }

  async getTextContents(path: string): Promise<string> {
    if (!(await this.doesEntryExist(path))) {
      throw Error(`/File does not exist: ${path}`);
    }
    return getZipEntryAsText(this.zip, path);
  }

  async getBinaryContents(path: string): Promise<Uint8Array> {
    if (!(await this.doesEntryExist(path))) {
      throw Error(`/File does not exist: ${path}`);
    }
    return getZipEntryAsBinary(this.zip, path);
  }

  async doesEntryExist(path: string): Promise<boolean> {
    return existZipEntry(this.zip, path);
  }
}

export default RustZipExtensionHandle;
