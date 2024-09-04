import {
  fetch as tauriFetch,
  FetchOptions,
  Response,
  ResponseType,
} from '@tauri-apps/api/http';
import {
  download as tauriPluginDownload,
  upload as tauriPluginUpload,
} from 'tauri-plugin-upload-api';
import { resolvePath } from './tauri-files';

function addToOptions(
  currentOptions: Partial<FetchOptions> | undefined,
  addOptions: Partial<FetchOptions>,
): Partial<FetchOptions> {
  // merge with addOptions, ONLY with special handling for the headers
  if (!currentOptions) {
    return addOptions;
  }
  const headersToUse = { ...currentOptions?.headers, ...addOptions?.headers };
  const newOptions = { ...currentOptions, ...addOptions };
  newOptions.headers = headersToUse;
  return newOptions;
}

export function fetch<T>(
  url: string,
  options?: FetchOptions,
): Promise<Response<T>> {
  return tauriFetch<T>(url, options);
}

export function get<T>(url: string, options?: Omit<FetchOptions, 'method'>) {
  const nextOptions = addToOptions(options, { method: 'GET' });
  return fetch<T>(url, nextOptions as FetchOptions);
}

export function getSimple<T>(
  url: string,
  responseType: ResponseType,
  accept: string,
  auth?: string,
) {
  const options: Omit<FetchOptions, 'method'> = {
    responseType,
    headers: { Accept: accept },
  };
  if (auth && options.headers) {
    options.headers.Authorization = auth;
  }
  return get<T>(url, options);
}

// still allows Accept headers, but good enough
export function getBinary<T>(
  url: string,
  options?: Omit<FetchOptions, 'method' | 'responseType'>,
) {
  const nextOptions = addToOptions(options, {
    responseType: ResponseType.Binary,
    headers: { Accept: 'application/octet-stream' },
  });
  return get<T>(url, nextOptions as FetchOptions);
}

// still allows Accept headers, but good enough
export function getJSON<T>(
  url: string,
  options?: Omit<FetchOptions, 'method' | 'responseType'>,
) {
  const nextOptions = addToOptions(options, {
    responseType: ResponseType.JSON,
    headers: { Accept: 'application/json' },
  });
  return get<T>(url, nextOptions as FetchOptions);
}

// tauri-plugin-upload

export type ProgressHandler = (
  chunkSize: number,
  currentSize: number,
  totalSize: number,
  currentPercent: number,
) => void;

export function asPercentage(value: number) {
  return value.toLocaleString(undefined, {
    style: 'percent',
    minimumFractionDigits: 2,
  });
}

function receiveWrappingProgressHandler(progressHandler?: ProgressHandler) {
  if (!progressHandler) {
    return undefined;
  }
  let currentSize = 0;
  return (progress: number, total: number) => {
    currentSize += progress;
    const percentage = total > 0 ? currentSize / total : NaN;
    progressHandler(progress, currentSize, total, percentage);
  };
}

async function load(
  direction: 'UP' | 'DOWN',
  url: string,
  paths: string | string[],
  progressHandler?: ProgressHandler,
  headers?: Map<string, string>,
) {
  const path = Array.isArray(paths) ? await resolvePath(...paths) : paths;

  let func;
  switch (direction) {
    case 'UP':
      func = tauriPluginUpload;
      break;
    case 'DOWN':
      func = tauriPluginDownload;
      break;
    default:
      return Promise.reject(new Error('Invalid http load direction.'));
  }
  return func(
    url,
    path,
    receiveWrappingProgressHandler(progressHandler),
    headers,
  );
}

// overwrites and there seems to be now way to cancel it
export function download(
  url: string,
  paths: string | string[],
  progressHandler?: ProgressHandler,
  headers?: Map<string, string>,
) {
  return load('DOWN', url, paths, progressHandler, headers);
}

export function upload(
  url: string,
  paths: string | string[],
  progressHandler?: ProgressHandler,
  headers?: Map<string, string>,
) {
  return load('UP', url, paths, progressHandler, headers);
}
