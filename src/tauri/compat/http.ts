// v1: '@tauri-apps/api/http'
// v2 replaced the custom client with a WHATWG `fetch`. This adapts it back to
// the v1 `fetch(url, { responseType })` -> `Response { ok, status, data }` shape.
import { fetch as v2Fetch } from '@tauri-apps/plugin-http';

export enum ResponseType {
  JSON = 1,
  Text = 2,
  Binary = 3,
}

type HttpVerb =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'DELETE'
  | 'PATCH'
  | 'HEAD'
  | 'OPTIONS'
  | 'CONNECT'
  | 'TRACE';

export interface FetchOptions {
  method: HttpVerb;
  headers?: Record<string, string>;
  query?: Record<string, string>;
  body?: BodyInit;
  /** in seconds, as in v1 */
  timeout?: number;
  responseType?: ResponseType;
}

export interface Response<T> {
  url: string;
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  rawHeaders: Record<string, string[]>;
  /** For `ResponseType.Binary` this is a `Uint8Array` (v1: `number[]`). */
  data: T;
}

export async function fetch<T>(
  url: string,
  options?: FetchOptions,
): Promise<Response<T>> {
  const target = new URL(url);
  Object.entries(options?.query ?? {}).forEach(([k, v]) =>
    target.searchParams.append(k, v),
  );
  const response = await v2Fetch(target.toString(), {
    method: options?.method ?? 'GET',
    headers: options?.headers,
    body: options?.body,
    connectTimeout:
      options?.timeout === undefined ? undefined : options.timeout * 1000,
  });

  let data: unknown;
  switch (options?.responseType ?? ResponseType.JSON) {
    case ResponseType.Text:
      data = await response.text();
      break;
    case ResponseType.Binary:
      data = new Uint8Array(await response.arrayBuffer());
      break;
    default: {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch (e) {
        // v1 rejected non-JSON bodies only for successful responses
        if (response.ok) throw e;
        data = text;
      }
    }
  }

  const headers: Record<string, string> = {};
  const rawHeaders: Record<string, string[]> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
    (rawHeaders[key] ??= []).push(value);
  });

  return {
    url: response.url,
    status: response.status,
    ok: response.ok,
    headers,
    rawHeaders,
    data: data as T,
  };
}
