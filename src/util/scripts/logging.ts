/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable max-classes-per-file */
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

abstract class AbstractLogger {
  #keepMsg: undefined | boolean;

  #keepSubst: undefined | boolean;

  shouldKeepMsg(keep: boolean) {
    this.#keepMsg = keep;
    return this;
  }

  get keepMsg() {
    return this.#keepMsg;
  }

  shouldKeepSubst(keep: boolean) {
    this.#keepSubst = keep;
    return this;
  }

  get keepSubst() {
    return this.#keepSubst;
  }

  abstract msg(msg: string, ...subst: unknown[]): LoggerState;

  // auto created fill string for every provided structure, will still only log as strings
  obj(...subst: unknown[]): LoggerState {
    return this.msg(Array(subst.length).fill('{}').join(' '), ...subst);
  }
}

class LoggerState extends AbstractLogger {
  #logger: Logger;

  #msg: string;

  #subst: unknown[];

  constructor(logger: Logger, msg: string, ...subst: unknown[]) {
    super();
    this.#logger = logger;
    this.#msg = msg;
    this.#subst = subst;
  }

  static #transformSubst(value: unknown) {
    return value != null &&
      (Array.isArray(value) || value.toString === Object.prototype.toString)
      ? JSON.stringify(value)
      : String(value);
  }

  static #generateLogBinding(
    loggingFunc: (...args: unknown[]) => void,
    loggingObject: { toString: () => string },
  ) {
    return loggingFunc.bind(console, '%s', loggingObject);
  }

  #generateMsg() {
    // currently hardcoded format
    const messageBase = `${this.#logger.name} : ${this.#msg}`;

    let replaceIndex = 0;
    const createdMessage = messageBase.replaceAll('{}', () => {
      // eslint-disable-next-line no-plusplus
      const currentIndex = replaceIndex++;
      return currentIndex >= this.#subst.length
        ? '{undefined}' // should be clear enough
        : LoggerState.#transformSubst(this.#subst[currentIndex]);
    });

    return createdMessage;
  }

  // calling any getter generates the message, (empties the state) and prepares the object
  #generateLoggingObject(level: number) {
    const message = this.#generateMsg();

    // after created message, reset if said
    this.#msg = this.keepMsg ? this.#msg : '';
    this.#subst = this.keepSubst ? this.#subst : [];

    return {
      toString: () => {
        logWithFrontendPrefix(level, message);
        return message;
      },
    };
  }

  get keepMsg() {
    return super.keepMsg ?? this.#logger.keepMsg;
  }

  get keepSubst() {
    return super.keepSubst ?? this.#logger.keepSubst;
  }

  setMsg(msg: string) {
    this.#msg = msg;
    return this;
  }

  setSubst(...subst: unknown[]) {
    this.#subst = subst;
    return this;
  }

  msg(msg: string, ...subst: unknown[]): LoggerState {
    this.#msg = msg;
    this.#subst = subst;
    return this;
  }

  get trace(): () => void {
    return LoggerState.#generateLogBinding(
      console.trace,
      this.#generateLoggingObject(LOG_LEVEL.TRACE),
    );
  }

  get debug(): () => void {
    return LoggerState.#generateLogBinding(
      console.debug,
      this.#generateLoggingObject(LOG_LEVEL.DEBUG),
    );
  }

  get info(): () => void {
    return LoggerState.#generateLogBinding(
      console.info,
      this.#generateLoggingObject(LOG_LEVEL.INFO),
    );
  }

  get warn(): () => void {
    return LoggerState.#generateLogBinding(
      console.warn,
      this.#generateLoggingObject(LOG_LEVEL.WARN),
    );
  }

  get error(): () => void {
    return LoggerState.#generateLogBinding(
      console.error,
      this.#generateLoggingObject(LOG_LEVEL.ERROR),
    );
  }
}

export class Logger extends AbstractLogger {
  #name: string;

  constructor(name: string) {
    super();
    this.#name = name;
    this.shouldKeepMsg(false);
    this.shouldKeepSubst(false);
  }

  withName(name: string) {
    this.#name = name;
    return this;
  }

  get name() {
    return this.#name;
  }

  msg(msg: string, ...subst: unknown[]) {
    return new LoggerState(this, msg, ...subst);
  }
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
