import { atom } from 'jotai';
import * as GuiSettings from '../../../../function/gui-settings/settings';

// eslint-disable-next-line import/prefer-default-export
export const LAUNCH_OPTION_SECURITY_ATOM = atom(
  (get) => {
    const options = get(GuiSettings.LAUNCH_SETTINGS_ATOM);
    return options.security;
  },
  (get, set, newValue: boolean) => {
    const options = get(GuiSettings.LAUNCH_SETTINGS_ATOM);
    options.security = newValue;
    set(GuiSettings.LAUNCH_SETTINGS_ATOM, { ...options });
  },
);

export const LAUNCH_OPTION_NO_SECURITY_ATOM = atom(
  (get) => !get(LAUNCH_OPTION_SECURITY_ATOM),
  (_, set, newValue: boolean) => set(LAUNCH_OPTION_SECURITY_ATOM, !newValue),
);
