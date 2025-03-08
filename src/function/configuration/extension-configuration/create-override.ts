import { ConfigMetaContent } from '../../../config/ucp/config-merge/objects';
import { Override } from '../overrides';

// eslint-disable-next-line import/prefer-default-export
export function createOverride(
  overridden: ConfigMetaContent,
  overriding: ConfigMetaContent,
  url: string,
): Override {
  return {
    overridden:
      overridden.type === 'user'
        ? {
            type: 'user',
            qualifier: overridden.qualifier,
            url,
            value: overridden.content,
            name: overridden.entityName,
          }
        : {
            type: 'extension',
            entity: overridden.entity,
            qualifier: overridden.qualifier,
            url,
            value: overridden.content,
            name: overridden.entityName,
          },
    overriding:
      overriding.type === 'user'
        ? {
            type: 'user',
            qualifier: overriding.qualifier,
            url,
            value: overriding.content,
            name: overriding.entityName,
          }
        : {
            type: 'extension',
            entity: overriding.entity,
            qualifier: overriding.qualifier,
            url,
            value: overriding.content,
            name: overriding.entityName,
          },
  } as Override;
}
