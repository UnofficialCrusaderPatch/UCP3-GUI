import { showError } from 'tauri/tauri-dialog';
import {
  loadZip,
  closeZip,
  existZipEntry,
  getZipEntryAsBinary,
  getZipEntryAsText,
} from 'tauri/tauri-invoke';

const ZIP_GC_REGISTRY = new FinalizationRegistry((id: number) => {
  closeZip(id).catch((err) =>
    showError(
      `Error cleaning up zip handler:\n${err}\nWas close called on this GC collected zip?`,
      'Zip Handler'
    )
  );
});

export default class ZipHandler {
  #path: string;

  #id: number;

  private constructor(path: string, id: number) {
    this.#path = path;
    this.#id = id;
  }

  static async withZipDo(
    path: string,
    func: (handler: ZipHandler) => Promise<void>
  ): Promise<void> {
    const handler = await ZipHandler.open(path);
    try {
      await func(handler);
    } finally {
      await handler.close();
    }
  }

  // TODO: no proper error handling or anything stopping an invalid id call
  static async open(path: string): Promise<ZipHandler> {
    const id = await loadZip(path);
    return new ZipHandler(path, id);
  }

  // if this is called, the close is triggered when the object is GC
  static async openGC(path: string): Promise<ZipHandler> {
    const id = await loadZip(path);
    const handler = new ZipHandler(path, id);
    ZIP_GC_REGISTRY.register(handler, id);
    return handler;
  }

  async close() {
    return closeZip(this.#id);
  }

  async doesEntryExist(path: string) {
    return existZipEntry(this.#id, path);
  }

  async getEntryAsBinary(path: string) {
    return getZipEntryAsBinary(this.#id, path);
  }

  async getEntryAsText(path: string) {
    return getZipEntryAsText(this.#id, path);
  }
}
