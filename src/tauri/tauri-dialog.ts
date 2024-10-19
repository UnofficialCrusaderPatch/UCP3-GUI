import { dialog } from '@tauri-apps/api';
import Option from '../util/structs/option';

export async function open(
  options?: dialog.OpenDialogOptions | undefined,
): Promise<string | string[] | null> {
  return dialog.open(options);
}

export async function save(
  options?: dialog.SaveDialogOptions | undefined,
): Promise<string | null> {
  return dialog.save(options);
}

// helper functions:

export async function saveFileDialog(
  baseFolder?: string,
  filters?: { name: string; extensions: string[] }[],
  title?: string,
): Promise<Option<string>> {
  const result = await save({
    defaultPath: baseFolder,
    filters,
    title,
  });
  return result ? Option.of(result) : Option.ofEmpty();
}

export async function openFileDialog(
  baseFolder?: string,
  filters?: { name: string; extensions: string[] }[],
  title?: string,
): Promise<Option<string>> {
  const result = await open({
    directory: false,
    multiple: false,
    defaultPath: baseFolder,
    filters,
    title,
    recursive: true,
  });
  return result && !Array.isArray(result)
    ? Option.of(result)
    : Option.ofEmpty();
}

export async function openFolderDialog(
  baseFolder?: string,
  title?: string,
): Promise<Option<string>> {
  const result = await open({
    directory: true,
    multiple: false,
    defaultPath: baseFolder,
    title,
    recursive: true,
  });
  return result && !Array.isArray(result)
    ? Option.of(result)
    : Option.ofEmpty();
}
