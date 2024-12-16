import { Extension } from '../../../config/ucp/common';
import { ConfigMetaContent } from '../../../config/ucp/config-merge/objects';

// eslint-disable-next-line import/prefer-default-export
export function buildConfigMetaContent(
  ext: Extension | undefined,
  k: string,
  v: unknown,
) {
  let truekey = k;
  let qualifier = 'unspecified';
  if (k.startsWith('required-')) {
    // eslint-disable-next-line prefer-destructuring
    truekey = k.split('required-', 2)[1];
    qualifier = 'required';
  } else if (k.startsWith('suggested-')) {
    // eslint-disable-next-line prefer-destructuring
    truekey = k.split('suggested-', 2)[1];
    qualifier = 'suggested';
  }

  return {
    truekey,
    configMetaContent:
      ext === undefined
        ? ({
            type: 'user',
            entityName: 'user',
            content: v,
            qualifier,
          } as ConfigMetaContent)
        : ({
            type: 'extension',
            entity: ext,
            entityName: ext.name,
            content: v,
            qualifier,
          } as ConfigMetaContent),
  };
}
