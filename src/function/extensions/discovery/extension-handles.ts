import { type FileEntry } from '@tauri-apps/api/fs';
import { readDir } from '../../../tauri/tauri-files';
import { slashify } from '../../../tauri/tauri-invoke';
import DirectoryExtensionHandle from '../handles/directory-extension-handle';
import { ExtensionHandle } from '../handles/extension-handle';
import RustZipExtensionHandle from '../handles/rust-zip-extension-handle';
import { unzipPlugins } from './io';

// eslint-disable-next-line import/prefer-default-export
export async function getExtensionHandles(ucpFolder: string) {
  const moduleDir = `${ucpFolder}/modules/`;
  const readModuleDirResult = await readDir(moduleDir);

  if (readModuleDirResult.isErr()) {
    const err = readModuleDirResult.err().get();
    if (
      (err as object)
        .toString()
        .startsWith('path not allowed on the configured scope')
    ) {
      throw Error(
        `Cannot process extensions. List of extensions will be empty. \n\n Reason: App is not allowed to access: ${moduleDir}`,
      );
    }

    readModuleDirResult.throwIfErr();

    return [];
  }

  const modDirEnts = readModuleDirResult
    .ok()
    .getOrReceive(() => []) as FileEntry[];

  const pluginDir = `${ucpFolder}/plugins/`;
  let readPluginDirResult = await readDir(pluginDir);

  if (readPluginDirResult.isErr()) {
    const err = readPluginDirResult.err().get();
    if (
      (err as object)
        .toString()
        .startsWith('path not allowed on the configured scope')
    ) {
      throw Error(
        `Cannot process extensions. List of extensions will be empty. \n\n Reason: App is not allowed to access: ${pluginDir}`,
      );
    }

    readPluginDirResult.throwIfErr();

    return [];
  }
  let pluginDirEnts = readPluginDirResult
    .ok()
    .getOrReceive(() => []) as FileEntry[];

  await unzipPlugins(pluginDirEnts);

  readPluginDirResult = await readDir(pluginDir);
  pluginDirEnts = (
    readPluginDirResult.ok().getOrReceive(() => []) as FileEntry[]
  ).filter((fe) => !fe.path.endsWith('.zip'));

  const de: FileEntry[] = [...modDirEnts, ...pluginDirEnts].filter(
    (fe) =>
      (fe.name || '').endsWith('.zip') ||
      (fe.children !== null && fe.children !== undefined),
  );
  const den = de.map((f) => f.name);
  const dirEnts = de.filter((e) => {
    // Zip files supersede folders
    // const isDirectory = e.children !== null && e.children !== undefined;
    // if (isDirectory) {
    //   const zipFileName = `${e.name}.zip`;
    //   if (den.indexOf(zipFileName) !== -1) {
    //     return false;
    //   }
    // }
    // Folders supersede zip files?
    if (e.name?.endsWith('.zip')) {
      const dirName = e.name.split('.zip')[0];
      if (den.indexOf(`${dirName}`) !== -1) {
        return false;
      }
    }
    return true;
  });

  const exts = await Promise.all(
    dirEnts.map(async (fe: FileEntry) => {
      const type = modDirEnts.indexOf(fe) === -1 ? 'plugin' : 'module';

      const folder = await slashify(
        type === 'module'
          ? `${ucpFolder}/modules/${fe.name}`
          : `${ucpFolder}/plugins/${fe.name}`,
      );

      if (fe.name !== undefined && fe.name.endsWith('.zip')) {
        // TODO: Do hash check here!
        const result = await RustZipExtensionHandle.fromPath(folder);
        return result as ExtensionHandle;
      }
      if (fe.children !== null) {
        // fe is a directory
        return new DirectoryExtensionHandle(folder) as ExtensionHandle;
      }
      throw new Error(`${folder} not a valid extension directory`);
    }),
  );

  return exts;
}
