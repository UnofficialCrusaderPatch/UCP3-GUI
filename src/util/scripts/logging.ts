/* eslint-disable @typescript-eslint/no-use-before-define */
/* eslint-disable max-classes-per-file */
/* eslint-disable no-console */
import { TauriEvent } from '@tauri-apps/api/event';
import { registerTauriEventListener } from 'tauri/tauri-hooks';
import { log } from 'tauri/tauri-invoke';
import { onBackendLog } from 'tauri/tauri-listen';

// allow support for removing cycling references for json serialization
import './cycle';

const JSON = globalThis.JSON as JSON & {
  decycle: (value: unknown, replacer?: unknown) => unknown;
  retrocycle: (value: unknown) => unknown;
};

const LOG_LEVEL = {
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4,
  TRACE: 5,
};

abstract class AbstractLogger {
  #keepMsg: undefined | boolean;

  #keepSubst: undefined | boolean;

  #prettyJson: undefined | boolean;

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

  shouldPrettyJson(pretty: boolean) {
    this.#prettyJson = pretty;
    return this;
  }

  get prettyJson() {
    return this.#prettyJson;
  }

  // note, that given subst without marker ({}) in the string are not used
  abstract msg(msg: string, ...subst: unknown[]): LoggerState;

  // auto created fill string for every provided structure, will still only log as strings
  // note, that while it allows as many values as needed, it does not support combining markers and appending objects
  obj(...values: unknown[]): LoggerState {
    return this.msg(Array(values.length).fill('{}').join(' '), ...values);
  }

  empty(): LoggerState {
    return this.obj();
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

  static #transformSubst(value: unknown, prettyJson: undefined | boolean) {
    if (
      value == null ||
      !(Array.isArray(value) || value.toString === Object.prototype.toString)
    ) {
      return String(value);
    }

    try {
      return JSON.stringify(JSON.decycle(value), null, prettyJson ? 2 : 0);
    } catch (e) {
      return `[Failed JSON serialization: ${e}]`;
    }
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
        : LoggerState.#transformSubst(
            this.#subst[currentIndex],
            this.prettyJson,
          );
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
        log(level, message);
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

  get prettyJson() {
    return super.prettyJson ?? this.#logger.prettyJson;
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

  // note, that trace in JS outputs the stack trace (trace(...) here used console.debug before)
  // after a bit of thought, this feels in line with trace being very verbose
  // the change might be reverted, though, since it might be overkill once the log level of the backend effects the frontend
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

class Logger extends AbstractLogger {
  #name: string;

  constructor(name: string) {
    super();
    this.#name = name;
    this.shouldKeepMsg(false);
    this.shouldKeepSubst(false);
    this.shouldPrettyJson(false);
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

// source: https://stackoverflow.com/a/49560222

const handleUncaughtError = (e: ErrorEvent) => {
  log(
    LOG_LEVEL.ERROR,
    `${e.filename}(${e.lineno}:${e.colno}) : ${e.type} : ${e.message}`,
  );
  return false;
};

const handleUncaughtPromise = (e: PromiseRejectionEvent) => {
  const message = `Promise rejected : ${e.type} : ${e.reason}`;
  console.error(message);
  log(LOG_LEVEL.ERROR, message).catch((reason) =>
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

// Currently simply provides the console.log calls, which will not be logged in the backend
// May or may not receive other control values (or be part of the log level)
// Should only be used if the values are cyclic (no JSON serialization) or should be inspected
// The lesser it is used, the better
export const ConsoleLogger = {
  trace: console.trace.bind(console),
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
};

export default Logger;
