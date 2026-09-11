import { ExtensionIOCallback } from '../../../../config/ucp/common';
import { getStore } from '../../../../hooks/jotai/base';
import { LANGUAGE_ATOM } from '../../../gui-settings/settings';
import DirectoryExtensionHandle from '../../handles/directory-extension-handle';
import { ExtensionHandle } from '../../handles/extension-handle';
import RustZipExtensionHandle from '../../handles/rust-zip-extension-handle';
import { DESCRIPTION_FILE } from '../io';

// eslint-disable-next-line import/prefer-default-export
export const createIO = (eh: ExtensionHandle) => ({
  descriptionRevision: Date.now(),
  handle: async <R>(cb: ExtensionIOCallback<R>) => {
    const neh = await eh.clone();
    try {
      return await cb(neh);
    } finally {
      neh.close();
    }
  },
  fetchDescription: async (language?: string) => {
    const lang = language ?? getStore().get(LANGUAGE_ATOM);
    const neh = await eh.clone();
    try {
      const paths = [
        ...new Set([
          `locale/description-${lang}.md`,
          `locale/description-${lang.split('-')[0]}.md`,
          `locale/${DESCRIPTION_FILE}`,
          DESCRIPTION_FILE,
          'locale/description-en.md',
        ]),
      ];
      const readPath = async (index: number): Promise<string> => {
        const path = paths[index];
        if (!path) return '';
        if (await neh.doesEntryExist(path)) {
          const text = await neh.getTextContents(path);
          if (text.trim()) return text;
        }
        return readPath(index + 1);
      };
      return await readPath(0);
    } finally {
      neh.close();
    }
  },
  isZip: eh instanceof RustZipExtensionHandle,
  isDirectory: eh instanceof DirectoryExtensionHandle,
  path: eh.path,
});
