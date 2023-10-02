import {
  loadZipReader,
  closeZipReader,
  existZipReaderEntry,
  getZipReaderEntryAsBinary,
  getZipReaderEntryAsText,
} from 'tauri/tauri-invoke';

// TODO: rename to reader or combine with Writer
// TODO: recreate on cleanup close -> so that even if everything wents wrong the zip is cleaned up
//  (use closed boolean, but only for silentClose)

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
    const id = await loadZipReader(path);
    return new ZipHandler(path, id);
  }

  async close() {
    return closeZipReader(this.#id);
  }

  async doesEntryExist(path: string) {
    return existZipReaderEntry(this.#id, path);
  }

  async getEntryAsBinary(path: string) {
    return getZipReaderEntryAsBinary(this.#id, path);
  }

  async getEntryAsText(path: string) {
    return getZipReaderEntryAsText(this.#id, path);
  }
}
