import { open } from '@tauri-apps/api/shell';
import { invoke } from '@tauri-apps/api/tauri';
import Logger from '../util/scripts/logging';

const LOGGER = new Logger('tauri-shell.ts');

// eslint-disable-next-line import/prefer-default-export
export async function shellOpen(path: string) {
  LOGGER.msg(`Opening in Explorer: ${path}`).debug();
  await open(path);
}

// Filesystem actions use the scoped host boundary, never file associations.
export async function openExtensionsFolder(gameFolder: string) {
  return invoke<void>('open_extension_path', { gameFolder });
}

export async function openInstalledExtension(
  gameFolder: string,
  path: string,
  openDirectory: boolean,
) {
  return invoke<void>('open_extension_path', {
    gameFolder,
    path,
    openDirectory,
  });
}
