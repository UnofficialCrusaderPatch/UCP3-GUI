import {
  exists as fileExists,
  createDir,
  FsOptions,
  readTextFile as tauriReadTextFile,
  writeTextFile as tauriWriteTextFile,
  readBinaryFile as tauriReadBinaryFile,
  writeBinaryFile as tauriWriteBinaryFile,
  copyFile as tauriCopyFile,
  removeFile as tauriRemoveFile,
  BinaryFileContents,
} from '@tauri-apps/api/fs';
import {
  fetch,
  FetchOptions,
  HttpVerb,
  Response,
  ResponseType,
} from '@tauri-apps/api/http';
import {
  dataDir,
  dirname,
  localDataDir,
  normalize as normalizePath,
  resolve,
} from '@tauri-apps/api/path';
import {
  DocumentOptions,
  parse as yamlParse,
  ParseOptions,
  SchemaOptions,
  ToJSOptions,
} from 'yaml';
import Result from './result';

// TYPES

export type Yaml = any;
export type Json = any;
export type Error = unknown;

// CODE

const BASE_FOLDER = 'UnofficialCrusaderPatch3';

// at the time of writing this, there is a typing error for fs.exists
// this function is used to proxy every call, so that the error only needs to be ignored here
// eslint-disable-next-line import/prefer-default-export
export async function proxyFsExists(
  path: string,
  options?: FsOptions | undefined
): Promise<boolean> {
  return (await fileExists(path, options)) as unknown as boolean;
}

// only proxy
export async function resolvePath(...paths: string[]): Promise<string> {
  return resolve(...paths);
}

export async function recursiveCreateDir(
  path: string
): Promise<Result<void, Error>> {
  try {
    await createDir(await dirname(path), { recursive: true });
  } catch (error) {
    return Result.err(error); // may create empty err -> already weakness, but ok for small project
  }
  return Result.emptyOk();
}

export async function readTextFile(
  path: string
): Promise<Result<string, Error>> {
  try {
    return Result.ok(await tauriReadTextFile(path));
  } catch (error) {
    return Result.err(error);
  }
}

export async function readBinaryFile(
  path: string
): Promise<Result<Uint8Array, Error>> {
  try {
    return Result.ok(await tauriReadBinaryFile(path));
  } catch (error) {
    return Result.err(error);
  }
}

export async function writeTextFile(
  path: string,
  contents: string
): Promise<Result<void, Error>> {
  const dirResult = await recursiveCreateDir(path);
  if (dirResult.isErr()) {
    return dirResult;
  }

  try {
    await tauriWriteTextFile(path, contents);
  } catch (error) {
    return Result.err(error);
  }
  return Result.emptyOk();
}

export async function writeBinaryFile(
  path: string,
  contents: BinaryFileContents
): Promise<Result<void, Error>> {
  const dirResult = await recursiveCreateDir(path);
  if (dirResult.isErr()) {
    return dirResult;
  }

  try {
    await tauriWriteBinaryFile(path, contents);
  } catch (error) {
    return Result.err(error);
  }
  return Result.emptyOk();
}

export async function copyFile(
  source: string,
  destination: string
): Promise<Result<void, Error>> {
  try {
    await tauriCopyFile(source, destination);
    return Result.emptyOk();
  } catch (error) {
    return Result.err(error);
  }
}

export async function removeFile(path: string): Promise<Result<void, Error>> {
  try {
    await tauriRemoveFile(path);
    return Result.emptyOk();
  } catch (error) {
    return Result.err(error);
  }
}

export async function loadYaml(
  path: string,
  yamlOptions?:
    | (ParseOptions & DocumentOptions & SchemaOptions & ToJSOptions)
    | undefined
): Promise<Result<Yaml, Error>> {
  const readResult = await readTextFile(path);
  if (readResult.isErr()) {
    return readResult; // will be error
  }

  try {
    // errors are thrown outside, so the loss of the error should be no problem
    return readResult.mapOk((content) => yamlParse(content, yamlOptions));
  } catch (error) {
    return Result.err(error);
  }
}

export async function loadJson(
  path: string,
  reviver?:
    | ((this: unknown, key: string, value: unknown) => unknown)
    | undefined
): Promise<Result<Json, Error>> {
  const readResult = await readTextFile(path);
  if (readResult.isErr()) {
    return readResult; // will be error
  }

  try {
    // errors are thrown outside, so the loss of the error should be no problem
    return readResult.mapOk((result) => JSON.parse(result, reviver));
  } catch (error) {
    return Result.err(error);
  }
}

export async function writeJson(
  path: string,
  contents: unknown,
  replacer?:
    | ((this: unknown, key: string, value: unknown) => unknown)
    | undefined,
  space?: string | number | undefined
): Promise<Result<void, Error>> {
  try {
    const jsonStr = JSON.stringify(contents, replacer, space);
    return await writeTextFile(path, jsonStr);
  } catch (error) {
    return Result.err(error);
  }
}

export async function fetchBinary<T>(
  url: string,
  addOptions?:
    | (Omit<FetchOptions, 'method'> & { method?: HttpVerb })
    | undefined
): Promise<Response<T>> {
  let options: FetchOptions = {
    method: 'GET',
    responseType: ResponseType.Binary, // important, because we are downloading inside a browser
    headers: {
      Accept: 'application/octet-stream',
    },
  };
  // merge with addOptions, with special handling for the records
  // others are overwritten
  if (addOptions) {
    const headersToUse = { ...options.headers, ...addOptions?.headers };
    options = { ...options, ...addOptions };
    options.headers = headersToUse;
  }
  return fetch<T>(url, options);
}

// GET FOLDER

export const getRoamingDataFolder: () => Promise<string> = (() => {
  let roamingFolder: string | null = null;
  return async () => {
    if (roamingFolder) {
      return roamingFolder;
    }
    roamingFolder = `${await dataDir()}/${BASE_FOLDER}/`;
    if (!(await proxyFsExists(roamingFolder))) {
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
    console.log(`Executable path: ${f}`);
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
    if (!(await proxyFsExists(localDataFolder))) {
      await createDir(localDataFolder);
    }
    return localDataFolder;
  };
})();

export function getGameFolderPath(urlParams: URLSearchParams) {
  return urlParams.get('directory') || '';
}
