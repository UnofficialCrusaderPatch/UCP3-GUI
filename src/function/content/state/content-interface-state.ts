import { ContentElement } from '../types/content-element';

// eslint-disable-next-line import/prefer-default-export
export type ContentInterfaceState = {
  selected: Array<ContentElement>;
  includeInstalled: boolean;
  includeOnline: boolean;
  sortByName: boolean;
};

export const DEFAULT_CONTENT_INTERFACE_STATE: ContentInterfaceState = {
  selected: new Array<ContentElement>(),
  includeInstalled: true,
  includeOnline: true,
  sortByName: true,
};
