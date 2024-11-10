import { atom } from 'jotai';
import * as GuiSettings from '../../../../function/gui-settings/settings';

// eslint-disable-next-line import/prefer-default-export
export const LAUNCH_OPTION_CONSOLE_SHOW_ATOM = atom(
  (get) => {
    const options = get(GuiSettings.LAUNCH_SETTINGS_ATOM);
    return options.console.show;
  },
  (get, set, newValue: boolean) => {
    const options = get(GuiSettings.LAUNCH_SETTINGS_ATOM);
    options.console.show = newValue;
    set(GuiSettings.LAUNCH_SETTINGS_ATOM, { ...options });
  },
);
