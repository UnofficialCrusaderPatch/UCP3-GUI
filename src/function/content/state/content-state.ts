import { ContentElement } from '../types/content-element';

export type ContentState = {
  extensions: Array<ContentElement>;
};

export const DEFAULT_CONTENT_STATE: ContentState = {
  extensions: new Array<ContentElement>(
    {
      name: 'online-extension-one',
      displayName: 'Online extension 1',
      installed: true,
      online: false,
      version: '0.0.1',
      description: {
        default: `
### Online available extension number 1
v0.0.1
This is a description

`,
      },
    },
    {
      name: 'online-extension-two',
      displayName: 'Online extension 2',
      installed: false,
      online: true,
      version: '0.0.2',
      description: {
        default: `
### Online available extension number 2
v0.0.2
This is a description

`,
      },
    },
  ),
};
