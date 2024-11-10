import { open } from '@tauri-apps/api/shell';
import Logger from '../util/scripts/logging';

const LOGGER = new Logger('tauri-shell.ts');

// eslint-disable-next-line import/prefer-default-export
export async function shellOpen(path: string) {
  LOGGER.msg(`Opening in Explorer: ${path}`).debug();
  await open(path);
}
