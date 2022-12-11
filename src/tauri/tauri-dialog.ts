import { dialog } from '@tauri-apps/api';
import Option from 'util/structs/option';

async function messageWrapper(
  func: 'show' | 'ask' | 'confirm',
  message: string,
  title?: string,
  type?: 'info' | 'warning' | 'error'
): Promise<void | boolean> {
  switch (func) {
    case 'show':
      return dialog.message(message, { title, type });
    case 'ask':
      return dialog.ask(message, { title, type });
    case 'confirm':
      return dialog.confirm(message, { title, type });
    default:
      return dialog.message('Called message wrapper with invalid func type.', {
        type: 'error',
      });
  }
}

async function showMessage(
  message: string,
  title?: string,
  type?: 'info' | 'warning' | 'error'
): Promise<void> {
  return messageWrapper('show', message, title, type) as Promise<void>;
}

async function askMessage(
  message: string,
  title?: string,
  type?: 'info' | 'warning' | 'error'
): Promise<boolean> {
  return messageWrapper('ask', message, title, type) as Promise<boolean>;
}

async function confirmMessage(
  message: string,
  title?: string,
  type?: 'info' | 'warning' | 'error'
): Promise<boolean> {
  return messageWrapper('confirm', message, title, type) as Promise<boolean>;
}

export async function showInfo(message: string, title?: string): Promise<void> {
  return showMessage(message, title, 'info');
}

export async function showWarning(
  message: string,
  title?: string
): Promise<void> {
  return showMessage(message, title, 'warning');
}

export async function showError(
  message: string,
  title?: string
): Promise<void> {
  return showMessage(message, title, 'error');
}

export async function askInfo(
  message: string,
  title?: string
): Promise<boolean> {
  return askMessage(message, title, 'info');
}

export async function askWarning(
  message: string,
  title?: string
): Promise<boolean> {
  return askMessage(message, title, 'warning');
}

export async function askError(
  message: string,
  title?: string
): Promise<boolean> {
  return askMessage(message, title, 'error');
}

export async function confirmInfo(
  message: string,
  title?: string
): Promise<boolean> {
  return confirmMessage(message, title, 'info');
}

export async function confirmWarning(
  message: string,
  title?: string
): Promise<boolean> {
  return confirmMessage(message, title, 'warning');
}

export async function confirmError(
  message: string,
  title?: string
): Promise<boolean> {
  return confirmMessage(message, title, 'error');
}

export async function open(
  options?: dialog.OpenDialogOptions | undefined
): Promise<string | string[] | null> {
  return dialog.open(options);
}

export async function save(
  options?: dialog.SaveDialogOptions | undefined
): Promise<string | null> {
  return dialog.save(options);
}

// helper functions:

export async function openFileDialog(
  baseFolder?: string,
  filters?: { name: string; extensions: string[] }[],
  title?: string
): Promise<Option<string>> {
  const result = await open({
    directory: false,
    multiple: false,
    defaultPath: baseFolder,
    filters,
    title,
  });
  return result && !Array.isArray(result)
    ? Option.of(result)
    : Option.ofEmpty();
}

export async function openFolderDialog(
  baseFolder?: string,
  title?: string
): Promise<Option<string>> {
  const result = await open({
    directory: true,
    multiple: false,
    defaultPath: baseFolder,
    title,
  });
  return result && !Array.isArray(result)
    ? Option.of(result)
    : Option.ofEmpty();
}
