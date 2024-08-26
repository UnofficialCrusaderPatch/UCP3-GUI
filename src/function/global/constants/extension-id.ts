import { Extension } from '../../../config/ucp/common';
import { ContentElement } from '../../content/types/content-element';

// eslint-disable-next-line import/prefer-default-export
export function createExtensionID(contentElement: ContentElement | Extension) {
  return `${contentElement.definition.name}@${contentElement.definition.version}`;
}
