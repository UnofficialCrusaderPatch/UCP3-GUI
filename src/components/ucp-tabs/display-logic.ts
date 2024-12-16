import { atom } from 'jotai';
import {
  LOADABLE_UCP_STATE_ATOM,
  UCPFilesState,
} from '../../function/ucp-files/ucp-state';

// eslint-disable-next-line import/prefer-default-export
export const UCP_FOLDER_EXISTS_ATOM = atom((get) => {
  const state = get(LOADABLE_UCP_STATE_ATOM);
  const ucpFolderExists =
    state.state === 'hasData'
      ? state.data === UCPFilesState.ACTIVE ||
        state.data === UCPFilesState.INACTIVE ||
        state.data === UCPFilesState.BINK_VERSION_DIFFERENCE ||
        state.data === UCPFilesState.BINK_UCP_MISSING ||
        state.data === UCPFilesState.BINK_REAL_COPY_MISSING
      : false;

  return ucpFolderExists;
});

export const IS_GAME_FOLDER = atom((get) => {
  const state = get(LOADABLE_UCP_STATE_ATOM);
  const result =
    state.state === 'hasData'
      ? state.data === UCPFilesState.ACTIVE ||
        state.data === UCPFilesState.INACTIVE ||
        state.data === UCPFilesState.BINK_VERSION_DIFFERENCE ||
        state.data === UCPFilesState.BINK_UCP_MISSING ||
        state.data === UCPFilesState.BINK_REAL_COPY_MISSING ||
        state.data === UCPFilesState.NOT_INSTALLED ||
        state.data === UCPFilesState.NOT_INSTALLED_WITH_REAL_BINK
      : false;

  return result;
});

export const IS_ACTIVE = atom((get) => {
  const state = get(LOADABLE_UCP_STATE_ATOM);
  const result =
    state.state === 'hasData' ? state.data === UCPFilesState.ACTIVE : false;

  return result;
});
