import { Extension } from '../../../config/ucp/common';
import { ExtensionContent } from '../store/fetch';

export type ContentElement = ExtensionContent & {
  online: boolean;
  installed: boolean;
  extension?: Extension;
};
