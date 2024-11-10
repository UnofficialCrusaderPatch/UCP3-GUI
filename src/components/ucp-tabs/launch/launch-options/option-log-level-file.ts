import { atom } from 'jotai';
import * as GuiSettings from '../../../../function/gui-settings/settings';
import { translateToWord, translateToNumber } from './option-log-level-console';

// eslint-disable-next-line import/prefer-default-export
export const LAUNCH_OPTION_LOG_LEVEL_FILE_ATOM = atom(
  (get) => {
    const options = get(GuiSettings.LAUNCH_SETTINGS_ATOM);
    return translateToWord(options.logLevel.file);
  },
  (get, set, newValue: string) => {
    const options = get(GuiSettings.LAUNCH_SETTINGS_ATOM);
    options.logLevel.file = translateToWord(newValue);
    set(GuiSettings.LAUNCH_SETTINGS_ATOM, { ...options });
  },
);

export const LAUNCH_OPTION_LOG_LEVEL_FILE_ARG_ATOM = atom((get) =>
  translateToNumber(get(LAUNCH_OPTION_LOG_LEVEL_FILE_ATOM)),
);
