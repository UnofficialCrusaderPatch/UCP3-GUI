/* eslint-disable import/prefer-default-export */
import { EventCallback, listen } from '@tauri-apps/api/event';

const TAURI_EVENT = {
  LOG_BACKEND: 'backend-log',
};

export function onBackendLog(
  func: EventCallback<{ level: number; message: string }>,
) {
  return listen(TAURI_EVENT.LOG_BACKEND, func);
}
