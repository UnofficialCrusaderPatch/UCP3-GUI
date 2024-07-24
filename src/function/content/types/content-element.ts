export type ContentElementDescriptions = {
  default: string;
  en?: string;
  de?: string;
};

export type ContentElement = {
  name: string;
  displayName: string;
  online: boolean;
  installed: boolean;
  version: string;
  description: ContentElementDescriptions;
};
