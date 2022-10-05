import type { FsOptions } from '@tauri-apps/api/fs';
import { exists as fileExists } from '@tauri-apps/api/fs';

// at the time of writing this, there is a typing error for fs.exists
// this function is used to proxy every call, so that the error only needs to be ignored here
// eslint-disable-next-line import/prefer-default-export
export async function proxyFsExists(
  path: string,
  options?: FsOptions | undefined
): Promise<boolean> {
  return (await fileExists(path, options)) as unknown as boolean;
}
