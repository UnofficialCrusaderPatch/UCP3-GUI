import { ExtensionContent } from '../store/fetch';

// eslint-disable-next-line import/prefer-default-export
export type ContentInterfaceState = {
  selected: Array<ExtensionContent>;
  includeInstalled: boolean;
  includeOnline: boolean;
  sortByName: boolean;
};

export const DEFAULT_CONTENT_INTERFACE_STATE: ContentInterfaceState = {
  selected: new Array<ExtensionContent>(),
  includeInstalled: true,
  includeOnline: true,
  sortByName: true,
};
