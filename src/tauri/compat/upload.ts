// v1: 'tauri-plugin-upload-api'
// v2 calls the progress handler with an object instead of (progress, total).
import {
  download as v2Download,
  upload as v2Upload,
} from '@tauri-apps/plugin-upload';

type ProgressHandler = (progress: number, total: number) => void;

function adapt(handler?: ProgressHandler) {
  return handler
    ? ({ progress, total }: { progress: number; total: number }) =>
        handler(progress, total)
    : undefined;
}

export async function download(
  url: string,
  filePath: string,
  progressHandler?: ProgressHandler,
  headers?: Map<string, string>,
): Promise<void> {
  await v2Download(url, filePath, adapt(progressHandler), headers);
}

export async function upload(
  url: string,
  filePath: string,
  progressHandler?: ProgressHandler,
  headers?: Map<string, string>,
): Promise<string> {
  return v2Upload(url, filePath, adapt(progressHandler), headers);
}
