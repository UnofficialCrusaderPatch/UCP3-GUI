import { atom } from 'jotai';
import * as GuiSettings from '../../../../function/gui-settings/settings';

// eslint-disable-next-line import/prefer-default-export
export const LAUNCH_OPTION_DISPLAY_ATOM = atom(
  (get) => {
    const options = get(GuiSettings.LAUNCH_SETTINGS_ATOM);
    return options.view;
  },
  (get, set, newValue: boolean) => {
    const options = get(GuiSettings.LAUNCH_SETTINGS_ATOM);
    options.view = newValue;
    set(GuiSettings.LAUNCH_SETTINGS_ATOM, { ...options });
  },
);
