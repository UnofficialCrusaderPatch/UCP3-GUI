import {
  BlobReader,
  BlobWriter,
  Entry,
  TextWriter,
  Uint8ArrayWriter,
  ZipReader,
} from '@zip.js/zip.js';
import ExtensionHandle from './ExtensionHandle';
import { readBinaryFile } from '../../renderer/utils/file-utils';

class StreamZipExtensionHandle implements ExtensionHandle {
  path: string;

  zip: ZipReader<unknown>;

  zipEntries: Entry[];

  constructor(path: string, zip: ZipReader<unknown>) {
    this.zip = zip;
    this.path = path;
    this.zipEntries = undefined as Entry[];
  }

  static async fromPath(path: string) {
    const [blob, error] = await readBinaryFile(path);
    if (blob === undefined || error)
      throw new Error(`Could not read zip file: ${path}: ${error}`);
    const zip = new ZipReader(new BlobReader(new Blob([blob])));
    return new StreamZipExtensionHandle(path, zip);
  }

  async doesEntryExist(path: string) {
    if (this.zipEntries === undefined)
      this.zipEntries = await this.zip.getEntries();
    return this.zipEntries.filter((e) => e.filename === path).length === 1;
  }

  async getBinaryContents(path: string): Promise<Uint8Array> {
    if (this.zipEntries === undefined)
      this.zipEntries = await this.zip.getEntries();
    const matches = this.zipEntries.filter((e) => e.filename === path);
    if (matches.length !== 1) {
      throw new Error(`File not found: ${this.path}/${path}`);
    }
    const writer = new Uint8ArrayWriter();
    return matches[0].getData(writer);
  }

  async getTextContents(path: string) {
    if (this.zipEntries === undefined)
      this.zipEntries = await this.zip.getEntries();
    const matches = this.zipEntries.filter((e) => e.filename === path);
    if (matches.length !== 1) {
      throw new Error(`File not found: ${this.path}/${path}`);
    }
    const writer = new TextWriter('utf-8');
    return matches[0].getData(writer);
  }
}

export default StreamZipExtensionHandle;
