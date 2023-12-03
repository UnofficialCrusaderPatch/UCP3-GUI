interface ExtensionHandle {
  path: string;
  getTextContents(path: string): Promise<string>;
  getBinaryContents(path: string): Promise<Uint8Array>;
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
