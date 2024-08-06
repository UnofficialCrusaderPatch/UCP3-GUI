import { ExtensionIOCallback } from '../../../../config/ucp/common';
import { getStore } from '../../../../hooks/jotai/base';
import { LANGUAGE_ATOM } from '../../../gui-settings/settings';
import DirectoryExtensionHandle from '../../handles/directory-extension-handle';
import { ExtensionHandle } from '../../handles/extension-handle';
import RustZipExtensionHandle from '../../handles/rust-zip-extension-handle';
import { DESCRIPTION_FILE } from '../io';

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
  fetchDescription: async () => {
    const lang = getStore().get(LANGUAGE_ATOM);
    const neh = await eh.clone();
    try {
      if (await neh.doesEntryExist(`locale/description-${lang}.md`)) {
        return await neh.getTextContents(`locale/description-${lang}.md`);
      }
      if (await neh.doesEntryExist(`locale/${DESCRIPTION_FILE}`)) {
        return await neh.getTextContents(`locale/${DESCRIPTION_FILE}`);
      }
      if (await neh.doesEntryExist(DESCRIPTION_FILE)) {
        return await neh.getTextContents(DESCRIPTION_FILE);
      }

      return 'Sorry, no description.md file was found';
    } finally {
      neh.close();
    }
  },
  isZip: eh instanceof RustZipExtensionHandle,
  isDirectory: eh instanceof DirectoryExtensionHandle,
  path: eh.path,
});
