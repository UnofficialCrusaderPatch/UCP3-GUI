import { exists as fileExists, createDir, FsOptions } from '@tauri-apps/api/fs';
import { dataDir, normalize as normalizePath } from '@tauri-apps/api/path';

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

export const getBaseFolder: () => Promise<string> = (function () {
  let baseFolder: string | null = null;
  return async () => {
    if (baseFolder) {
      return baseFolder;
    }
    baseFolder = `${await dataDir()}/${BASE_FOLDER}/`;
    if (!(await proxyFsExists(baseFolder))) {
      createDir(baseFolder);
    }
    return baseFolder;
  };
})();

export const getExeFolder: () => Promise<string> = (function () {
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
