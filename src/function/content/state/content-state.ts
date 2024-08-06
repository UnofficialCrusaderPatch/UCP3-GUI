import { ContentElement } from '../types/content-element';

export type ContentState = {
  extensions: Array<ContentElement>;
};

export const DEFAULT_CONTENT_STATE: ContentState = {
  extensions: new Array<ContentElement>(),
};
