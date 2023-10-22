import { EventCallback, listen } from '@tauri-apps/api/event';

const TAURI_EVENT = {
  LANGUAGE_CHANGE: 'language-change',
  LOG_BACKEND: 'backend-log',
};

export function onLanguageChange(func: EventCallback<string>) {
  return listen(TAURI_EVENT.LANGUAGE_CHANGE, func);
}

export function onBackendLog(
  func: EventCallback<{ level: number; message: string }>,
) {
  return listen(TAURI_EVENT.LOG_BACKEND, func);
}
