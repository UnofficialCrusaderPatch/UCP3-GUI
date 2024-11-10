import { atom } from 'jotai';
import * as GuiSettings from '../../../../function/gui-settings/settings';

// eslint-disable-next-line import/prefer-default-export
export const LAUNCH_OPTION_GAME_DATA_PATH_ATOM = atom(
  (get) => {
    const options = get(GuiSettings.LAUNCH_SETTINGS_ATOM);
    return options.gameDataPath;
  },
  (get, set, newValue: string) => {
    const options = get(GuiSettings.LAUNCH_SETTINGS_ATOM);
    options.gameDataPath = newValue;
    set(GuiSettings.LAUNCH_SETTINGS_ATOM, { ...options });
  },
);
