import { ZipHandler } from 'util/structs/zip-handler';
import ExtensionHandle from './extension-handle';

const REGISTRY = new FinalizationRegistry((zip: ZipHandler) => zip.close());

class RustZipExtensionHandle implements ExtensionHandle {
  #zip: ZipHandler;

  path: string;

  private constructor(path: string, zip: ZipHandler) {
    this.path = path;
    this.#zip = zip;
    REGISTRY.register(this, this.#zip);
  }

  static async fromPath(path: string) {
    return new RustZipExtensionHandle(path, await ZipHandler.open(path));
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
}

export default RustZipExtensionHandle;
