import { atom } from 'jotai';
import * as GuiSettings from '../../../../function/gui-settings/settings';

export const LOG_LEVELS: Record<string, string> = {
  DEFAULT: '0',
  FATAL: '-3',
  ERROR: '-2',
  WARNING: '-1',
  INFO: '0',
  DEBUG: '1',
  VERBOSE: '2',
};

export const LOG_LEVELS_INVERSE: Record<string, string> = {
  '': 'DEFAULT',
  '-3': 'FATAL',
  '-2': 'ERROR',
  '-1': 'WARNING',
  '0': 'INFO',
  '1': 'DEBUG',
  '2': 'VERBOSE',
};

export function translateToWord(a: string) {
  if (Object.keys(LOG_LEVELS_INVERSE).indexOf(a) !== -1) {
    return LOG_LEVELS_INVERSE[a];
  }
  if (Object.keys(LOG_LEVELS).indexOf(a) !== -1) {
    return a;
  }
  throw Error(`Unknown log level: ${a}`);
}

export function translateToNumber(a: string) {
  if (Object.keys(LOG_LEVELS_INVERSE).indexOf(a) !== -1) {
    return a;
  }
  if (Object.keys(LOG_LEVELS).indexOf(a) !== -1) {
    return LOG_LEVELS[a];
  }
  throw Error(`Unknown log level: ${a}`);
}

// eslint-disable-next-line import/prefer-default-export
export const LAUNCH_OPTION_LOG_LEVEL_CONSOLE_ATOM = atom(
  (get) => {
    const options = get(GuiSettings.LAUNCH_SETTINGS_ATOM);
    return translateToWord(options.logLevel.console);
  },
  (get, set, newValue: string) => {
    const options = get(GuiSettings.LAUNCH_SETTINGS_ATOM);
    options.logLevel.console = translateToWord(newValue);
    set(GuiSettings.LAUNCH_SETTINGS_ATOM, { ...options });
  },
);

export const LAUNCH_OPTION_LOG_LEVEL_CONSOLE_ARG_ATOM = atom((get) =>
  translateToNumber(get(LAUNCH_OPTION_LOG_LEVEL_CONSOLE_ATOM)),
);
