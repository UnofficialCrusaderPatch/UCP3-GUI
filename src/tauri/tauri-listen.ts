/* eslint-disable import/prefer-default-export */
import { EventCallback, listen } from '@tauri-apps/api/event';

const TAURI_EVENT = {
  LOG_BACKEND: 'backend-log',
  FILE_CONFIG: 'file-config',
};

export function onBackendLog(
  func: EventCallback<{ level: number; message: string }>,
) {
  return listen(TAURI_EVENT.LOG_BACKEND, func);
}

export function onGuiFileConfigChange(
  func: EventCallback<{ eventType: string }>,
) {
  return listen(TAURI_EVENT.FILE_CONFIG, func);
}
