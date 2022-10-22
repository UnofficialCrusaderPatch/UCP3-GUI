// Helper file, wrapping tauri invokes in simple functions

import { invoke } from '@tauri-apps/api/tauri';

const TAURI_COMMAND = {
  DIRECTORY_TO_FS_SCOPE: 'add_dir_to_fs_scope',
};

// eslint-disable-next-line import/prefer-default-export
export async function addCompleteDirectoryToFsScope(path: string) {
  return invoke(TAURI_COMMAND.DIRECTORY_TO_FS_SCOPE, { path });
}
