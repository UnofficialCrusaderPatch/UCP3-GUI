import {
  loadZip,
  closeZip,
  existZipEntry,
  getZipEntryAsBinary,
  getZipEntryAsText,
} from 'tauri/tauri-invoke';

// eslint-disable-next-line import/prefer-default-export
export class ZipHandler {
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
