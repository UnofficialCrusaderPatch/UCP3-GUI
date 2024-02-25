import { ExtensionIOCallback } from '../../../../config/ucp/common';
import DirectoryExtensionHandle from '../../handles/directory-extension-handle';
import { ExtensionHandle } from '../../handles/extension-handle';
import RustZipExtensionHandle from '../../handles/rust-zip-extension-handle';

// eslint-disable-next-line import/prefer-default-export
export const createIO = (eh: ExtensionHandle) => ({
  handle: async <R>(cb: ExtensionIOCallback<R>) => {
    const neh = await eh.clone();
    try {
      return await cb(neh);
    } finally {
      neh.close();
    }
  },
  isZip: eh instanceof RustZipExtensionHandle,
  isDirectory: eh instanceof DirectoryExtensionHandle,
  path: eh.path,
});
