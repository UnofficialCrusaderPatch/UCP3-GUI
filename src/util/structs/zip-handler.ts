/* eslint-disable max-classes-per-file */
import { showError } from 'tauri/tauri-dialog';
import {
  loadZipReader,
  closeZipReader,
  existZipReaderEntry,
  getZipReaderEntryAsBinary,
  getZipReaderEntryAsText,
  closeZipWriter,
  loadZipWriter,
  addZipWriterDirectory,
  writeZipWriterEntryFromBinary,
  writeZipWriterEntryFromText,
  writeZipWriterEntryFromFile,
  isZipReaderEmpty,
  getZipReaderNumberOfEntries,
  getZipReaderEntryNames,
} from 'tauri/tauri-invoke';

export class ZipReader {
  // do not change, handle like const!
  static #READER_GC_REGISTRY = new FinalizationRegistry((id: number) => {
    closeZipReader(id).catch((err) =>
      showError(
        `Error cleaning up not closed zip reader:\n${err}`,
        'Zip Reader',
      ),
    );
  });

  #path: string;

  #id: number;

  private constructor(path: string, id: number) {
    this.#path = path;
    this.#id = id;
  }

  static async withZipReaderDo(
    path: string,
    func: (reader: ZipReader) => Promise<void>,
  ): Promise<void> {
    const reader = await ZipReader.open(path);
    try {
      await func(reader);
    } finally {
      await reader.close();
    }
  }

  static async open(path: string): Promise<ZipReader> {
    const id = await loadZipReader(path);
    const reader = new ZipReader(path, id);
    ZipReader.#READER_GC_REGISTRY.register(reader, id, reader);
    return reader;
  }

  async close() {
    await closeZipReader(this.#id); // will fail if already closed
    ZipReader.#READER_GC_REGISTRY.unregister(this);
  }

  async isEmpty() {
    return isZipReaderEmpty(this.#id);
  }

  async getNumberOfEntries() {
    return getZipReaderNumberOfEntries(this.#id);
  }

  async doesEntryExist(path: string) {
    return existZipReaderEntry(this.#id, path);
  }

  async getEntryNames(globPattern?: string) {
    return getZipReaderEntryNames(this.#id, globPattern);
  }

  async getEntryAsBinary(path: string) {
    return getZipReaderEntryAsBinary(this.#id, path);
  }

  async getEntryAsText(path: string) {
    return getZipReaderEntryAsText(this.#id, path);
  }
}

export class ZipWriter {
  // do not change, handle like const!
  static #WRITER_GC_REGISTRY = new FinalizationRegistry((id: number) => {
    closeZipWriter(id).catch((err) =>
      showError(
        `Error cleaning up not closed zip writer:\n${err}`,
        'Zip Writer',
      ),
    );
  });

  #path: string;

  #id: number;

  private constructor(path: string, id: number) {
    this.#path = path;
    this.#id = id;
  }

  static async withZipWriterDo(
    path: string,
    func: (writer: ZipWriter) => Promise<void>,
  ): Promise<void> {
    const writer = await ZipWriter.open(path);
    try {
      await func(writer);
    } finally {
      await writer.close();
    }
  }

  static async open(path: string): Promise<ZipWriter> {
    const id = await loadZipWriter(path);
    const writer = new ZipWriter(path, id);
    ZipWriter.#WRITER_GC_REGISTRY.register(writer, id, writer);
    return writer;
  }

  async close() {
    await closeZipWriter(this.#id); // will fail if already closed
    ZipWriter.#WRITER_GC_REGISTRY.unregister(this);
  }

  async addDirectory(path: string) {
    return addZipWriterDirectory(this.#id, path);
  }

  async writeEntryFromBinary(path: string, binary: ArrayBuffer) {
    return writeZipWriterEntryFromBinary(this.#id, path, binary);
  }

  async writeEntryFromText(path: string, text: string) {
    return writeZipWriterEntryFromText(this.#id, path, text);
  }

  async writeEntryFromFile(path: string, source: string) {
    return writeZipWriterEntryFromFile(this.#id, path, source);
  }
}
