import { atom } from 'jotai';
import * as GuiSettings from '../../../../function/gui-settings/settings';

// eslint-disable-next-line import/prefer-default-export
export const LAUNCH_OPTION_COMMAND_LINE_ARGUMENTS_ATOM = atom(
  (get) => {
    const options = get(GuiSettings.LAUNCH_SETTINGS_ATOM);
    return options.customLaunchArguments;
  },
  (get, set, newValue: string) => {
    const options = get(GuiSettings.LAUNCH_SETTINGS_ATOM);
    options.customLaunchArguments = newValue;
    set(GuiSettings.LAUNCH_SETTINGS_ATOM, { ...options });
  },
);

export const LAUNCH_OPTION_COMMAND_LINE_ARGUMENTS_TOKENS_ATOM = atom((get) => {
  const characters = get(LAUNCH_OPTION_COMMAND_LINE_ARGUMENTS_ATOM).split('');
  const tokens: string[] = [];

  let isQuoted = false;
  let token = '';

  characters.forEach((char) => {
    if (isQuoted) {
      if (char === '"') {
        isQuoted = false;
        token += char;
        tokens.push(token);
        token = '';
      } else {
        token += char;
      }
    } else if (char === '"') {
      isQuoted = true;
      token += char;
    } else if (char === ' ') {
      tokens.push(token);
      token = '';
    } else {
      token += char;
    }
  });

  if (isQuoted === false && token.length > 0) {
    tokens.push(token);
  } else {
    // Could be considered an error, or incomplete input...
  }

  return tokens;
});
