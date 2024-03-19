import {
  exists as tauriFileExists,
  createDir,
  readDir as tauriReadDir,
  FsOptions,
  readTextFile as tauriReadTextFile,
  writeTextFile as tauriWriteTextFile,
  readBinaryFile as tauriReadBinaryFile,
  writeBinaryFile as tauriWriteBinaryFile,
  copyFile as tauriCopyFile,
  renameFile as tauriRenameFile,
  removeFile as tauriRemoveFile,
  removeDir as tauriRemoveDir,
  BinaryFileContents,
  FsDirOptions,
} from '@tauri-apps/api/fs';
import {
  dataDir,
  dirname,
  downloadDir,
  join,
  localDataDir,
  normalize as normalizePath,
  resolve,
  resolveResource,
  basename as tauriBasename,
} from '@tauri-apps/api/path';
import {
  DocumentOptions,
  parse as yamlParse,
  ParseOptions,
  SchemaOptions,
  ToJSOptions,
} from 'yaml';
import { convertFileSrc } from '@tauri-apps/api/tauri';
import Result from '../util/structs/result';
import {
  readAndFilterPaths as invokeReadAndFilterPaths,
  slashify as invokeSlashify,
  canonicalize as invokeCanonicalize,
  scanFileForBytes as invokeScanFileForBytes,
} from './tauri-invoke';
import Option from '../util/structs/option';

// WARNING: Tauri funcs lie about their return.
// Void Promises return "null" as result instead of undefined.

// TYPES

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Yaml = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any;
export type Error = unknown;

// CODE

const BASE_FOLDER = 'UnofficialCrusaderPatch3';
const MISSING_FILE_OS_ERROR = '(os error 2)'; // might only apply to windows

async function validateRemoval(
  path: string,
  result: Result<void, unknown>, // result produced by one of the removal functions
): Promise<Result<void, unknown>> {
  if (result.isOk()) {
    return result;
  }

  const error = result.err().get();
  if (String(error).endsWith(MISSING_FILE_OS_ERROR)) {
    return Result.emptyOk();
  }
  // check to be sure
  // eslint-disable-next-line @typescript-eslint/no-use-before-define
  return (await onFsExists(path)) ? result : Result.emptyOk();
}

export async function slashify(path: string): Promise<Result<string, Error>> {
  return Result.tryAsync(invokeSlashify, path);
}

export async function canonicalize(
  path: string,
  slashifyPath?: boolean,
): Promise<Result<string, Error>> {
  return Result.tryAsync(invokeCanonicalize, path, slashifyPath);
}

// only proxy
export async function basename(path: string, ext?: string | undefined) {
  return tauriBasename(path, ext);
}

// only proxy
export async function onFsExists(
  path: string,
  options?: FsOptions | undefined,
): Promise<boolean> {
  return tauriFileExists(path, options);
}

// only proxy
export async function resolvePath(...paths: string[]): Promise<string> {
  return resolve(...paths);
}

// only proxy
export async function joinPaths(...paths: string[]) {
  return join(...paths);
}

export function receiveAssetUrl<
  T extends string | string[],
  R = T extends string ? string : Promise<string>,
>(paths: T, protocol?: string): R {
  const convertToAssetUrl = (path: string) => convertFileSrc(path, protocol);
  return Array.isArray(paths)
    ? (joinPaths(...paths).then(convertToAssetUrl) as R)
    : (convertToAssetUrl(paths) as R);
}

export async function resolveResourcePath<T extends string | string[]>(
  paths: T,
): Promise<string> {
  return Array.isArray(paths)
    ? joinPaths(...paths).then(resolveResource)
    : resolveResource(paths);
}

// WARNING: directly writing in DOWNLOAD for example does not work,
// since interacting with this folder (like in this function), is forbidden,
// which might be better, actually
export async function recursiveCreateDirForFile(
  filepath: string,
): Promise<Result<void, Error>> {
  return Result.tryAsync(async () => {
    const folderpath = await dirname(filepath); // may cause issues if not file path
    await createDir(folderpath, { recursive: true });
  });
}

export async function readTextFile(
  path: string,
): Promise<Result<string, Error>> {
  return Result.tryAsync(tauriReadTextFile, path);
}

export async function readBinaryFile(
  path: string,
): Promise<Result<Uint8Array, Error>> {
  return Result.tryAsync(tauriReadBinaryFile, path);
}

export async function writeTextFile(
  path: string,
  contents: string,
): Promise<Result<void, Error>> {
  return Result.tryAsync(async () => {
    (await recursiveCreateDirForFile(path)).throwIfErr();
    await tauriWriteTextFile(path, contents);
  });
}

export async function writeBinaryFile(
  path: string,
  contents: BinaryFileContents,
): Promise<Result<void, Error>> {
  return Result.tryAsync(async () => {
    (await recursiveCreateDirForFile(path)).throwIfErr();
    await tauriWriteBinaryFile(path, contents);
  });
}

export async function copyFile(
  source: string,
  destination: string,
): Promise<Result<void, Error>> {
  return Result.tryAsync(tauriCopyFile, source, destination);
}

export async function renameFile(
  oldPath: string,
  newPath: string,
): Promise<Result<void, Error>> {
  return Result.tryAsync(tauriRenameFile, oldPath, newPath);
}

export async function removeFile(
  path: string,
  ignoreNotFound?: boolean,
): Promise<Result<void, Error>> {
  const result = await Result.tryAsync(tauriRemoveFile, path);
  return ignoreNotFound ? validateRemoval(path, result) : result;
}

export async function loadYaml(
  path: string,
  yamlOptions?:
    | (ParseOptions & DocumentOptions & SchemaOptions & ToJSOptions)
    | undefined,
): Promise<Result<Yaml, Error>> {
  return Result.tryAsync(async () => {
    const readContent = (await readTextFile(path)).getOrThrow();
    return yamlParse(readContent, yamlOptions);
  });
}

export async function loadJson(
  path: string,
  reviver?:
    | ((this: unknown, key: string, value: unknown) => unknown)
    | undefined,
): Promise<Result<Json, Error>> {
  return Result.tryAsync(async () => {
    const readContent = (await readTextFile(path)).getOrThrow();
    return JSON.parse(readContent, reviver);
  });
}

export async function writeJson(
  path: string,
  contents: unknown,
  replacer?:
    | ((this: unknown, key: string, value: unknown) => unknown)
    | undefined,
  space?: string | number | undefined,
): Promise<Result<void, Error>> {
  return Result.tryAsync(async () => {
    const jsonStr = JSON.stringify(contents, replacer, space);
    (await writeTextFile(path, jsonStr)).throwIfErr();
  });
}

export async function scanFileForBytes(
  paths: string | string[],
  searchBytes: string | BinaryFileContents,
  scanAmount?: number,
): Promise<Result<Option<number>, Error>> {
  const invokeFunc = (path: string) =>
    Result.tryAsync(invokeScanFileForBytes, path, searchBytes, scanAmount);
  const result = Array.isArray(paths)
    ? joinPaths(...paths).then(invokeFunc)
    : invokeFunc(paths);
  return (await result).mapOk(Option.ofNullable);
}

// GET FOLDER

export async function readDir(dir: string, options?: FsDirOptions | undefined) {
  return Result.tryAsync(tauriReadDir, dir, options);
}

export async function removeDir(
  path: string,
  recursive?: boolean,
  ignoreNotFound?: boolean,
): Promise<Result<void, Error>> {
  const result = await Result.tryAsync(tauriRemoveDir, path, { recursive });
  return ignoreNotFound ? validateRemoval(path, result) : result;
}

export async function readAndFilterPaths(dir: string, pattern: string) {
  return Result.tryAsync(invokeReadAndFilterPaths, dir, pattern);
}

export async function getDownloadFolder() {
  return downloadDir();
}

export const getRoamingDataFolder: () => Promise<string> = (() => {
  let roamingFolder: string | null = null;
  return async () => {
    if (roamingFolder) {
      return roamingFolder;
    }
    roamingFolder = `${await dataDir()}/${BASE_FOLDER}/`;
    if (!(await onFsExists(roamingFolder))) {
      await createDir(roamingFolder);
    }
    return roamingFolder;
  };
})();

export const getExeFolder: () => Promise<string> = (() => {
  let f: string | null = null;
  return async () => {
    if (f) {
      return f;
    }
    f = `${await normalizePath('.')}`;
    return f;
  };
})();

export const getLocalDataFolder: () => Promise<string> = (() => {
  let localDataFolder: string | null = null;
  return async () => {
    if (localDataFolder) {
      return localDataFolder;
    }
    localDataFolder = `${await localDataDir()}/${BASE_FOLDER}/`;
    if (!(await onFsExists(localDataFolder))) {
      await createDir(localDataFolder);
    }
    return localDataFolder;
  };
})();
