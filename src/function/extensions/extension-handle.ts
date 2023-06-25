interface ExtensionHandle {
  path: string;
  getTextContents(path: string): Promise<string>;
  getBinaryContents(path: string): Promise<Uint8Array>;
  doesEntryExist(path: string): Promise<boolean>;
  close(): Promise<void>;
}

export default ExtensionHandle;
