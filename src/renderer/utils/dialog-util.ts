import { dialog } from '@tauri-apps/api';

export async function showInfo(message: string, title?: string) {
  await dialog.message(message, {
    title: title || undefined,
    type: 'info',
  });
}

export async function showWarning(message: string, title?: string) {
  await dialog.message(message, {
    title: title || undefined,
    type: 'warning',
  });
}

export async function showError(message: string, title?: string) {
  await dialog.message(message, {
    title: title || undefined,
    type: 'error',
  });
}
