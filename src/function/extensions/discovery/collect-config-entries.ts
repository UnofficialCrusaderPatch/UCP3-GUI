import { ConfigEntry } from '../../../config/ucp/common';

// eslint-disable-next-line import/prefer-default-export
export function collectConfigEntries(
  obj: { contents: unknown; [key: string]: unknown },
  url?: string,
  collection?: { [key: string]: ConfigEntry },
) {
  // eslint-disable-next-line no-param-reassign
  if (collection === undefined) collection = {};
  // eslint-disable-next-line no-param-reassign
  if (url === undefined) url = '';

  if (obj !== null && obj !== undefined && typeof obj === 'object') {
    if (obj.contents !== undefined) {
      const o = obj as ConfigEntry;
      if (collection[url] !== undefined) {
        throw new Error(`url already has been set: ${url}`);
      }
      // eslint-disable-next-line no-param-reassign
      collection[url] = { ...o };
    } else {
      Object.keys(obj).forEach((key) => {
        let newUrl = url;
        if (newUrl === undefined) newUrl = '';
        if (newUrl !== '') {
          newUrl += '.';
        }
        newUrl += key;
        collectConfigEntries(
          obj[key] as { contents: unknown; [key: string]: unknown },
          newUrl,
          collection,
        );
      });
    }
  }

  return collection;
}
