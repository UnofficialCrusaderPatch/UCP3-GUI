import { atom } from 'jotai';
import * as GuiSettings from '../../../../function/gui-settings/settings';
import { UCP_ALLOW_MULTIPLE_INSTANCES_ARG } from './ucp-args';

export const LAUNCH_OPTION_ALLOW_MULTIPLE_INSTANCES_ATOM = atom(
  (get) => {
    const options = get(GuiSettings.LAUNCH_SETTINGS_ATOM);
    return options.allowMultipleInstances === true;
  },
  (get, set, newValue: boolean) => {
    const options = get(GuiSettings.LAUNCH_SETTINGS_ATOM);
    set(GuiSettings.LAUNCH_SETTINGS_ATOM, {
      ...options,
      allowMultipleInstances: newValue,
    });
  },
);

export function allowMultipleInstancesArgs(allowed: boolean): string[] {
  return allowed ? [UCP_ALLOW_MULTIPLE_INSTANCES_ARG] : [];
}
