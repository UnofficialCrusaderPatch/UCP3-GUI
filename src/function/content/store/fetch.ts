import { parse as parseYaml } from 'yaml';
import { ResponseType } from '@tauri-apps/api/http';
import { fetch } from '../../../tauri/tauri-http';
import Logger from '../../../util/scripts/logging';

const LOGGER = new Logger('store/fetch.ts');

export type OnlineDescriptionContent = {
  method: 'online';
  url: string;
  language: 'en' | 'de' | 'default';
};

export type InlineDescriptionContent = {
  method: 'inline';
  content: string;
  language: 'en' | 'de' | 'default';
};

export type DescriptionContent =
  | OnlineDescriptionContent
  | InlineDescriptionContent;

export type BinaryModulePackageContent = {
  method: 'binary';
  type: 'module';
  size: number;
  url: string;
  signer: string;
  hash: string;
  signature: string;
};

export type PluginPackageContent = {
  method: 'github-zip';
  type: 'plugin';
  size: number;
  url: string;
};

export type PackageContent = BinaryModulePackageContent | PluginPackageContent;

export type ExtensionContent = {
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
    description: DescriptionContent[];
    package: PackageContent[];
  };
};

export type ContentStore = {
  meta: {
    version: string;
  };
  framework: {
    version: string; // range
  };
  frontend: {
    version: string; // range
  };
  signer: string;
  timestamp: string;
  extensions: {
    list: ExtensionContent[];
    // lookup: {
    //   [key: string]: {
    //     signer: string;
    //     hash: string;
    //     signature: string;
    //   };
    // };
  };
};

export const fetchDescription = async (url: string): Promise<string> => {
  if (url === '')
    return new Promise((resolve) => {
      resolve(''); // Or reject?
    });
  LOGGER.msg(`Fetching description from web... ${url}`).warn();
  const result = await fetch<string>(url, {
    method: 'GET',
    responseType: ResponseType.Text,
  });

  return result.data;
};

// eslint-disable-next-line import/prefer-default-export
export const fetchStore = async () => {
  LOGGER.msg('Fetching store from web...').warn();
  const result = await fetch<string>(
    'https://gist.githubusercontent.com/gynt/236ebddce3dbd73d1482676c8c6e7186/raw/store.yml',
    {
      method: 'GET',
      responseType: ResponseType.Text,
    },
  )
    .then((resp) => resp.data)
    .then((data) => parseYaml(data) as ContentStore);

  return result;
};

export const dummyFetchStore = async () => {
  LOGGER.msg('Fetching store from dummy...').warn();
  return new Promise<ContentStore>((resolve) => {
    const data = `
meta:
  version: 1.0.0
frontend:
  version: ">=0.0.28"
framework:
  version: =3.0.0
timestamp: 2024-07-31T19:11:08.975Z
signer: UCP-Team-key-1
extensions:
  list:
    - definition:
        name: online-module-test-one
        type: module
        url: Where to find more INFO
        author: authors
        version: 0.0.1
        dependencies: {}
        display-name: "Online Module #1"
      sources:
        description:
          - language: default
            method: inline
            content: Online content temporary stub description 1
        package:
          - method: binary
            type: module
            size: 1000000
            url: stub
            signer: UCP-team-1
            hash: stubadwlkmaqwld219kf121d
            signature: stubsfksemlfsk112dd
    - definition:
        name: online-plugin-test-two
        type: plugin
        url: Where to find more INFO
        author: authors
        version: 0.0.1
        dependencies: {}
        display-name: "Online Plugin #2"
      sources:
        description:
          - language: default
            method: online
            url: https://raw.githubusercontent.com/UnofficialCrusaderPatch/extension-ucp2-evrey-aiv/main/README.md
        package:
          - method: zip
            type: plugin
            url: stub
            size: 2000000
    - definition:
        name: online-module-test-three
        type: plugin
        url: Where to find more INFO
        author: authors
        version: 0.0.1
        dependencies: {}
        display-name: "Online Plugin #3"
      sources:
        description:
          - language: default
            method: online
            url: https://raw.githubusercontent.com/UnofficialCrusaderPatch/extension-ucp2-evrey-aiv/main/README.md
          - language: default
            method: inline
            content: Hello!
        package:
          - method: zip
            type: plugin
            url: stub
            size: 2000000
    - definition:
        name: Legends-Of-The-Orient
        display-name: Legends Of The Orient
        author: Crusader Pilaw
        version: 3.0.1
        dependencies:
          Legends-Of-The-Orient-AI: ^3.0.1
          framework: ">=3.0.1"
          frontend: ">=1.0.2"
          ucp2-legacy: ^2.15.1
          startResources: ^1.0.0
          maploader: ^1.0.0
        type: plugin
      sources:
        description:
          - language: default
            method: online
            url: https://raw.githubusercontent.com/CrusaderPilaw/extension-Legends-of-the-Orient/main/locale/description-en.md
          - language: default
            method: inline
            content: Hello!
        package:
          - method: github-zip
            type: plugin
            url: https://github.com/CrusaderPilaw/extension-Legends-of-the-Orient/archive/9b35f668b6312a344a70999cedcc82bb1770f921.zip
            size: 15000000
    - definition:
        name: Legends-Of-The-Orient-AI
        display-name: Legends Of The Orient AI
        author: Crusader Pilaw
        version: 3.0.1
        dependencies:
          framework: ">=3.0.1"
          frontend: ">=1.0.2"
          aiSwapper: ^1.1.0
        type: plugin
      sources:
        description:
          - language: default
            method: online
            url: https://raw.githubusercontent.com/CrusaderPilaw/extension-Legends-of-the-Orient-AI/main/locale/description-en.md
          - language: default
            method: inline
            content: Hello!
        package:
          - method: github-zip
            type: plugin
            url: https://github.com/CrusaderPilaw/extension-Legends-of-the-Orient-AI/archive/371103bdcd876eea9c005943cf749bbdadf77981.zip
            size: 280000000
    - definition:
        name: Legends-Of-The-Orient-AI
        display-name: Legends Of The Orient AI
        author: Crusader Pilaw
        version: 3.0.0
        dependencies:
          framework: ">=3.0.1"
          frontend: ">=1.0.2"
          aiSwapper: ^1.1.0
        type: plugin
      sources:
        description:
          - language: default
            method: online
            url: https://raw.githubusercontent.com/CrusaderPilaw/extension-Legends-of-the-Orient-AI/main/locale/description-en.md
          - language: default
            method: inline
            content: Hello!
        package: []
  lookup:
    module-name-version:
      hash: sha256
      signature: hex value of the signed sha256 hash
      signer: UCP-Team-key-1
  
    `;
    resolve(parseYaml(data) as ContentStore);
  });
};
