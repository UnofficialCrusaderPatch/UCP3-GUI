import { EventCallback, listen } from '@tauri-apps/api/event';

const TAURI_EVENT = {
  LANGUAGE_CHANGE: 'language-change',
};

// eslint-disable-next-line import/prefer-default-export
export function onLanguageChange(func: EventCallback<string>) {
  return listen(TAURI_EVENT.LANGUAGE_CHANGE, func);
}
