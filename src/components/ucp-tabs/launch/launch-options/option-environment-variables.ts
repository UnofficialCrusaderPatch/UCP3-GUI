import { atom } from 'jotai';
import * as GuiSettings from '../../../../function/gui-settings/settings';

// eslint-disable-next-line import/prefer-default-export
export const LAUNCH_OPTION_ENVIRONMENT_VARIABLES_ATOM = atom(
  (get) => {
    const options = get(GuiSettings.LAUNCH_SETTINGS_ATOM);
    return options.customEnvVariables;
  },
  (get, set, newValue: { [key: string]: string }) => {
    const options = get(GuiSettings.LAUNCH_SETTINGS_ATOM);
    options.customEnvVariables = { ...newValue };
    set(GuiSettings.LAUNCH_SETTINGS_ATOM, { ...options });
  },
);
