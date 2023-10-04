/* eslint-disable no-console */
import { TauriEvent } from '@tauri-apps/api/event';
import { registerTauriEventListener } from 'tauri/tauri-hooks';
import { log } from 'tauri/tauri-invoke';
import { onBackendLog } from 'tauri/tauri-listen';

const LOG_LEVEL = {
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  TRACE: 5,
};

function logWithFrontendPrefix(level: number, message: unknown) {
  return log(level, `FRONTEND - ${message}`);
}

export function error(message: unknown) {
  console.error(message);
  return logWithFrontendPrefix(LOG_LEVEL.ERROR, message);
}

export function warn(message: unknown) {
  console.warn(message);
  return logWithFrontendPrefix(LOG_LEVEL.WARN, message);
}

export function info(message: unknown) {
  console.info(message);
  return logWithFrontendPrefix(LOG_LEVEL.INFO, message);
}

export function debug(message: unknown) {
  console.debug(message);
  return logWithFrontendPrefix(LOG_LEVEL.DEBUG, message);
}

export function trace(message: unknown) {
  console.debug(message); // trace also uses debug, since "trace" in the console means something else
  return logWithFrontendPrefix(LOG_LEVEL.TRACE, message);
}

// source: https://stackoverflow.com/a/49560222

const handleUncaughtError = (e: ErrorEvent) => {
  logWithFrontendPrefix(
    LOG_LEVEL.ERROR,
    `${e.filename}(${e.lineno}:${e.colno}) : ${e.type} : ${e.message}`,
  );
  return false;
};

const handleUncaughtPromise = (e: PromiseRejectionEvent) => {
  error(`Promise rejected : ${e.type} : ${e.reason}`).catch((reason) =>
    console.error(`Backend logging issue : ${e.type} : ${reason}`),
  );
};

window.addEventListener('error', handleUncaughtError, true);
window.addEventListener('unhandledrejection', handleUncaughtPromise, true);
registerTauriEventListener(TauriEvent.WINDOW_CLOSE_REQUESTED, () => {
  window.removeEventListener('error', handleUncaughtError, true);
  window.removeEventListener('unhandledrejection', handleUncaughtPromise, true);
});

const backendLogUnlistenPromise = onBackendLog(({ payload }) => {
  switch (payload.level) {
    case LOG_LEVEL.ERROR:
      console.error(payload.message);
      break;
    case LOG_LEVEL.WARN:
      console.warn(payload.message);
      break;
    case LOG_LEVEL.INFO:
      console.info(payload.message);
      break;
    case LOG_LEVEL.DEBUG:
      console.debug(payload.message);
      break;
    case LOG_LEVEL.TRACE:
      console.debug(payload.message);
      break;
    default:
      break;
  }
});
registerTauriEventListener(TauriEvent.WINDOW_CLOSE_REQUESTED, async () =>
  (await backendLogUnlistenPromise)(),
);
