// v1: '@tauri-apps/api/event'
// Same API in v2, except that the file drop events were renamed and their
// payload changed from `string[]` to `{ paths: string[], position }`.
import {
  listen as v2Listen,
  type Event,
  type EventCallback,
  type EventName,
  type Options,
  type UnlistenFn,
} from '@tauri-apps/api/event';

export {
  TauriEvent,
  emit,
  once,
  type Event,
  type EventCallback,
  type UnlistenFn,
} from '@tauri-apps/api/event';

const FILE_DROP_EVENTS: Record<string, string> = {
  'tauri://file-drop': 'tauri://drag-drop',
  'tauri://file-drop-hover': 'tauri://drag-enter',
  'tauri://file-drop-cancelled': 'tauri://drag-leave',
};

export async function listen<T>(
  event: EventName,
  handler: EventCallback<T>,
  options?: Options,
): Promise<UnlistenFn> {
  const v2Event = FILE_DROP_EVENTS[event as string];
  if (v2Event === undefined) {
    return v2Listen<T>(event, handler, options);
  }
  return v2Listen<{ paths?: string[] } | null>(
    v2Event,
    (e) =>
      handler({
        ...e,
        event,
        payload: (e.payload?.paths ?? []) as T,
      } as Event<T>),
    options,
  );
}
