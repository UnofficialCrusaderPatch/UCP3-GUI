// v1: '@tauri-apps/api/os'
import { type as v2Type } from '@tauri-apps/plugin-os';
import { tempDir } from '@tauri-apps/api/path';

export type OsType = 'Linux' | 'Darwin' | 'Windows_NT';

/** v1 semantics: async, returns 'Linux' | 'Darwin' | 'Windows_NT'. */
export async function type(): Promise<OsType> {
  switch (v2Type()) {
    case 'windows':
      return 'Windows_NT';
    case 'macos':
    case 'ios':
      return 'Darwin';
    default:
      return 'Linux';
  }
}

/** v1 `tempdir()`; v2 moved it to `path.tempDir()`. */
export async function tempdir(): Promise<string> {
  return tempDir();
}
