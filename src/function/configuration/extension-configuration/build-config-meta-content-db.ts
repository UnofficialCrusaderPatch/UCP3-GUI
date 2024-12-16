import { Extension, ConfigEntry } from '../../../config/ucp/common';
import { ConfigMetaContentDB } from '../../../config/ucp/config-merge/objects';
import { buildConfigMetaContent } from './build-config-meta-content';

export function buildConfigMetaContentDB(
  ext: Extension | undefined,
  ce: ConfigEntry,
) {
  const m: ConfigMetaContentDB = {};

  Object.entries(ce.contents)
    .map(([k, v]) => buildConfigMetaContent(ext, k, v))
    .forEach(({ truekey, configMetaContent }) => {
      m[truekey] = configMetaContent;
    });

  return m;
}

export function buildConfigMetaContentDBForUser(ce: ConfigEntry) {
  return buildConfigMetaContentDB(undefined, ce);
}
