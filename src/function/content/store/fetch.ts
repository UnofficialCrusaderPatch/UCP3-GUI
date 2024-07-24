import { parse as parseYaml } from 'yaml';
import { ResponseType } from '@tauri-apps/api/http';
import { fetch } from '../../../tauri/tauri-http';

export type ContentStore = {
  framework: {
    version: string; // range
  };
  meta: {
    version: string;
  };
  frontend: {
    version: string; // range
  };
  extensions: {
    content: [
      {
        definition: {
          version: string;
          name: string;
          dependencies: { [key: string]: string };
          author: string;
          url: string;
          'display-name': string;
          type: 'module' | 'plugin';
        };
        sources: {
          description: {
            de: string;
            en: string;
          };
          package: {
            url: string;
            signer: string;
            hash: string;
            signature: string;
          };
        };
      },
    ];
    // lookup: {
    //   [key: string]: {
    //     signer: string;
    //     hash: string;
    //     signature: string;
    //   };
    // };
  };
  signer: string;
  timestamp: string;
};

// eslint-disable-next-line import/prefer-default-export
export const fetchStore = async () =>
  fetch<string>(
    'https://gist.githubusercontent.com/gynt/236ebddce3dbd73d1482676c8c6e7186/raw/store.yml',
    {
      method: 'GET',
      responseType: ResponseType.Text,
    },
  )
    .then((resp) => resp.data)
    .then((data) => parseYaml(data) as ContentStore);
