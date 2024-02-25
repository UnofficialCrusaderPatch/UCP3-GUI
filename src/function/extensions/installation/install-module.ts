import yaml from 'yaml';
import { exists } from '@tauri-apps/api/fs';
import { basename } from '@tauri-apps/api/path';
import RustZipExtensionHandle from '../handles/rust-zip-extension-handle';
import { Definition } from '../../../config/ucp/common';
import { extractZipToPath } from '../../../tauri/tauri-invoke';
import { copyFile } from '../../../tauri/tauri-files';

const installPlugin = async (gameFolder: string, path: string) => {
  const fileName = await basename(path);
  const folderName = fileName.slice(undefined, -4);
  const destination = `${gameFolder}/ucp/plugins/${folderName}`;

  if (await exists(destination)) {
    throw Error(`plugin already exists: ${folderName}`);
  }

  await extractZipToPath(path, destination);
};

const installModule = async (gameFolder: string, path: string) => {
  const destination = `${gameFolder}/ucp/modules/`;

  const name = await basename(path);

  const sigPath = `${path}.sig`;

  if (await exists(sigPath)) {
    const copyResult1 = await copyFile(sigPath, `${destination}/${name}.sig`);
    copyResult1.throwIfErr();
  }

  (await copyFile(path, `${destination}/${name}`)).throwIfErr();
};

// eslint-disable-next-line import/prefer-default-export
export const installExtension = async (gameFolder: string, path: string) => {
  if (!path.endsWith('.zip')) {
    throw Error(`Path does not end with '.zip': ${path}`);
  }

  let definition = {
    type: undefined,
  } as unknown as Definition;

  await RustZipExtensionHandle.with(path, async (eh) => {
    if (!(await eh.doesEntryExist('definition.yml'))) {
      throw Error(`Zip file does not contain definition.yml`);
    }

    definition = yaml.parse(
      await eh.getTextContents('definition.yml'),
    ) as Definition;
  });

  if (definition.type === 'plugin') {
    return installPlugin(gameFolder, path);
  }

  if (definition.type === 'module') {
    return installModule(gameFolder, path);
  }

  throw Error('Cannot install extension because its type is unknown');
};
