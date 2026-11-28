interface ExtensionHandle {
  path: string;
  getTextContents(path: string): Promise<string>;
  // rejects files larger than maxSize bytes
  getBinaryContents(path: string, maxSize?: number): Promise<Uint8Array>;
  doesEntryExist(path: string): Promise<boolean>;
  close(): Promise<void>;
  clone(): Promise<ExtensionHandle>;

  listEntries(
    basePath: string,
    globPattern: string | undefined,
  ): Promise<Array<ExtensionFileHandle>>;
}

interface ExtensionFileHandle {
  path: string;

  extensionHandle: ExtensionHandle;

  isDirectory: boolean;

  getTextContents(): Promise<string>;
  getBinaryContents(): Promise<Uint8Array>;
}

export type { ExtensionHandle, ExtensionFileHandle };
