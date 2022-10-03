
import { exists as fileExists, FsOptions } from '@tauri-apps/api/fs';

// at the time of writing this, there is a typing error for fs.exists
// this function is used to proxy every call, so that the error only needs to be ignored here
export async function proxyFsExists(path: string, options?: FsOptions | undefined): Promise<boolean> {
    // @ts-ignore
    return await fileExists(path, options);
}