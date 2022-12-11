import {
  fetch as tauriFetch,
  FetchOptions,
  Response,
  ResponseType,
} from '@tauri-apps/api/http';

function addToOptions(
  currentOptions: Partial<FetchOptions> | undefined,
  addOptions: Partial<FetchOptions>
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
  options?: FetchOptions
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
  auth?: string
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
  options?: Omit<FetchOptions, 'method' | 'responseType'>
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
  options?: Omit<FetchOptions, 'method' | 'responseType'>
) {
  const nextOptions = addToOptions(options, {
    responseType: ResponseType.JSON,
    headers: { Accept: 'application/json' },
  });
  return get<T>(url, nextOptions as FetchOptions);
}
