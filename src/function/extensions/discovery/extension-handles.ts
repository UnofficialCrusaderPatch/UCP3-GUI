import { type FileEntry } from '@tauri-apps/api/fs';
import { readDir } from '../../../tauri/tauri-files';
import { slashify } from '../../../tauri/tauri-invoke';
import DirectoryExtensionHandle from '../handles/directory-extension-handle';
import { ExtensionHandle } from '../handles/extension-handle';
import RustZipExtensionHandle from '../handles/rust-zip-extension-handle';
import Logger from '../../../util/scripts/logging';
import Result from '../../../util/structs/result';

const EXTENSION_FILE_NAME_REGEX =
  /^([a-zA-Z0-9_-]+)(-)([0-9]+[.][0-9]+[.][0-9]+)([.]zip){0,1}$/g;

const LOGGER = new Logger('extension-handles.ts');

type Ignore = {
  status: 'ignore';
  entry: FileEntry;
  reason: string;
};

type Select = {
  status: 'select';
  handle: ExtensionHandle;
};

type SelectionResult = Ignore | Select;

const isZip = (fe: FileEntry) =>
  fe.name?.endsWith('.zip') === true &&
  (fe.children === undefined || fe.children === null);

const isFolder = (fe: FileEntry) =>
  fe.name?.endsWith('.zip') === false &&
  fe.children !== undefined &&
  fe.children !== null;

const isValidFileName = (fe: FileEntry) =>
  fe.name !== undefined && fe.name.match(EXTENSION_FILE_NAME_REGEX) !== null;

const checkIfNoError = (dir: string, result: Result<FileEntry[], unknown>) => {
  if (result.isErr()) {
    const err = result.err().get();
    if (
      (err as object)
        .toString()
        .startsWith('path not allowed on the configured scope')
    ) {
      throw Error(
        `Cannot process extensions. List of extensions will be empty. \n\n Reason: App is not allowed to access: ${dir}`,
      );
    }

    result.throwIfErr();

    return false;
  }

  return true;
};

// eslint-disable-next-line import/prefer-default-export
export async function getExtensionHandles(
  ucpFolder: string,
  mode?: 'Release' | 'Developer',
) {
  LOGGER.msg('get extension handles').info();

  // First try read the directories
  const moduleDir = `${ucpFolder}/modules/`;
  const readModuleDirResult = await readDir(moduleDir);

  if (!checkIfNoError(moduleDir, readModuleDirResult)) return [];

  const allModDirEnts = readModuleDirResult
    .ok()
    .getOrReceive(() => []) as FileEntry[];

  const pluginDir = `${ucpFolder}/plugins/`;
  const readPluginDirResult = await readDir(pluginDir);

  if (!checkIfNoError(pluginDir, readPluginDirResult)) return [];

  const allPluginDirEnts = readPluginDirResult
    .ok()
    .getOrReceive(() => []) as FileEntry[];

  // Filter module entries
  const validModDirEnts: FileEntry[] =
    mode === 'Developer'
      ? allModDirEnts
          .filter((fe) => isValidFileName(fe))
          .filter((fe) => isFolder(fe) || isZip(fe))
      : allModDirEnts
          .filter((fe) => isValidFileName(fe))
          .filter((fe) => isZip(fe));

  const validModDirEntsNames = validModDirEnts.map((f) => f.name);

  const modDirEnts =
    mode === 'Developer'
      ? validModDirEnts.filter((e) => {
          // Folders supersede zip files
          if (e.name?.endsWith('.zip')) {
            const dirName = e.name.split('.zip')[0];
            if (validModDirEntsNames.indexOf(`${dirName}`) !== -1) {
              return false;
            }
          }
          return true;
        })
      : validModDirEnts.filter((e) => {
          // Zip files supersede folders
          // There are no folders in this mode, but whatever...
          const isDirectory = e.children !== null && e.children !== undefined;
          if (isDirectory) {
            const zipFileName = `${e.name}.zip`;
            if (validModDirEntsNames.indexOf(zipFileName) !== -1) {
              return false;
            }
          }
          return true;
        });

  // Filter plugin entries
  const validPluginDirEnts: FileEntry[] = allPluginDirEnts
    .filter((fe) => isValidFileName(fe))
    .filter((fe) => isFolder(fe));

  const dirEnts = [...modDirEnts, ...validPluginDirEnts];

  // Generate an extension handle for each one
  const exts = (
    await Promise.all(
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

          if ((await result.doesEntryExist('definition.yml')) === false) {
            result.close();

            return {
              status: 'ignore',
              reason: 'no definition.yml',
              entry: fe,
            } as SelectionResult;
          }

          return {
            status: 'select',
            handle: result as ExtensionHandle,
          } as SelectionResult;
        }
        if (fe.children !== null) {
          // fe is a directory

          const result = new DirectoryExtensionHandle(folder);

          if ((await result.doesEntryExist('definition.yml')) === false) {
            result.close();

            return {
              status: 'ignore',
              reason: 'no definition.yml',
              entry: fe,
            } as SelectionResult;
          }

          return {
            status: 'select',
            handle: result as ExtensionHandle,
          } as SelectionResult;
        }
        throw new Error(`${folder} not a valid extension directory`);
      }),
    )
  )
    .filter((e) => e.status === 'select')
    .map((e) => (e as Select).handle);

  return exts;
}
