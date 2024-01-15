import { atom } from 'jotai';
import { CONFIGURATION_TOUCHED_REDUCER_ATOM } from '../../../../function/configuration/state';

export const CONFIG_EXTENSIONS_DIRTY_STATE_ATOM = atom<boolean>(false);

// eslint-disable-next-line import/prefer-default-export
export const CONFIG_DIRTY_STATE_ATOM = atom<boolean>(
  (get) =>
    Object.entries(get(CONFIGURATION_TOUCHED_REDUCER_ATOM)).filter(
      ([, touched]) => touched,
    ).length > 0 || get(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM) === true,
);
