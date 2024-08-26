import yaml from 'yaml';
import { exists } from '@tauri-apps/api/fs';
import { basename } from '@tauri-apps/api/path';
import RustZipExtensionHandle from '../handles/rust-zip-extension-handle';
import { Definition } from '../../../config/ucp/common';
import { extractZipToPath } from '../../../tauri/tauri-invoke';
import {
  copyFile,
  readDir,
  removeDir,
  renameFile,
  writeTextFile,
} from '../../../tauri/tauri-files';
import Logger from '../../../util/scripts/logging';
import {
  UCP_CACHE_FOLDER,
  UCP_MODULES_FOLDER,
  UCP_PLUGINS_FOLDER,
} from '../../global/constants/file-constants';

const LOGGER = new Logger(`install-extensions.ts`);

export type InstallPluginOptions = {
  zapRootFolder?: boolean;
  cacheDir?: string;
};

const InstallPluginDefaults = {
  zapRootFolder: false,
  cacheDir: `${UCP_CACHE_FOLDER}`,
} as InstallPluginOptions;

export const installPlugin = async (
  gameFolder: string,
  path: string,
  opts?: InstallPluginOptions,
) => {
  const options = { ...InstallPluginDefaults, ...opts };
  const fileName = await basename(path);
  const folderName = fileName.slice(undefined, -4);
  const destination = `${gameFolder}/${UCP_PLUGINS_FOLDER}${folderName}`;

  if (await exists(destination)) {
    throw Error(`plugin already exists: ${folderName}`);
  }

  if (options.zapRootFolder) {
    const tempFolder = `${gameFolder}/${options.cacheDir}${folderName}`;
    if (await exists(tempFolder)) {
      throw Error(`temp folder already exists: ${tempFolder}`);
    }
    LOGGER.msg(`Extracting zip ${path} to temp folder: ${tempFolder}`).debug();
    await extractZipToPath(path, tempFolder);

    const readDirResult = await readDir(tempFolder, {
      recursive: false,
    });

    if (!readDirResult.isOk()) {
      throw Error(
        `Failed to read dir: ${tempFolder}. Reason: ${readDirResult.err().get()}`,
      );
    }

    const entries = readDirResult
      .getOrThrow()
      .filter((fe) => fe.children !== null);

    if (entries.length !== 1) {
      throw Error(
        `Unexpected number of directories in directory, expected one: ${tempFolder}`,
      );
    }

    const subFolder = entries.at(0)!.path;

    LOGGER.msg(
      `Moving folder ${subFolder} to new location: ${destination}`,
    ).debug();
    const renameResult = await renameFile(subFolder, destination);

    if (!renameResult.isOk()) {
      throw Error(
        `Failed to move plugin folder ${subFolder} to new location: ${renameResult.err().get()}`,
      );
    }

    LOGGER.msg(`Removing temp folder: ${tempFolder}`).debug();
    const removeResult = await removeDir(tempFolder);
    if (!removeResult.isOk()) {
      throw Error(
        `Failed to remove temp folder ${tempFolder}. Reason: ${removeResult.err().get()}`,
      );
    }
  } else {
    await extractZipToPath(path, destination);
  }
};

export const installModule = async (
  gameFolder: string,
  path: string,
  signature?: string,
) => {
  LOGGER.msg(
    `Installing module (${signature === undefined ? 'unsigned' : 'signed'}): ${path}`,
  ).debug();
  const destination = `${gameFolder}/${UCP_MODULES_FOLDER}`;

  const name = await basename(path);

  const sigPath = `${path}.sig`;
  const sigDestPath = `${destination}/${name}.sig`;

  if (await exists(sigPath)) {
    (await copyFile(sigPath, sigDestPath)).throwIfErr();
  }

  if (signature !== undefined) {
    (await writeTextFile(sigDestPath, signature)).throwIfErr();
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
