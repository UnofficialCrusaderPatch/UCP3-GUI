import { Extension } from 'config/ucp/common';
import { atomWithReducer } from 'jotai/utils';
import { atom } from 'jotai';
import {
  ArrayReducerArgs,
  ArrayReducerState,
  ExtensionsState,
  KeyValueReducerArgs,
  KeyValueReducerState,
  Warning,
} from './types';

function KeyValueReducer<Type>() {
  return (
    state: KeyValueReducerState<Type>,
    action: KeyValueReducerArgs<Type>
  ) => {
    if (action.type === 'reset') {
      return { ...action.value };
    }
    if (action.type === 'set-multiple') {
      return { ...state, ...(action.value as object) };
    }
    throw new Error(`Unknown configuration action type: ${action.type}`);
  };
}

function ArrayReducer<Type>() {
  return (
    _state: ArrayReducerState<Type>,
    newState: ArrayReducerArgs<Type>
  ) => [...newState];
}

const configurationReducer = KeyValueReducer<unknown>();
const configurationTouchedReducer = KeyValueReducer<boolean>();
const configurationWarningReducer = KeyValueReducer<Warning>();
const activeExtensionsReducer = ArrayReducer<Extension>();
const configurationDefaultsReducer = KeyValueReducer<unknown>();

// normal atoms

export const FILE_ATOM = atom('');
export const FOLDER_ATOM = atom(''); // unused
export const EXTENSIONS_ATOM = atom([]); // how is this used?
export const EXTENSION_STATE_ATOM = atom({
  allExtensions: [],
  activeExtensions: [],
  activatedExtensions: [],
  installedExtensions: [],
} as ExtensionsState);

// reducer atoms

export const CONFIGURATION_REDUCER_ATOM = atomWithReducer(
  {},
  configurationReducer
);

export const CONFIGURATION_TOUCHED_REDUCER_ATOM = atomWithReducer(
  {},
  configurationTouchedReducer
);

export const CONFIGURATION_WARNING_REDUCER_ATOM = atomWithReducer(
  {},
  configurationWarningReducer
);

export const ACTIVE_EXTENSIONS_REDUCER_ATOM = atomWithReducer(
  [],
  activeExtensionsReducer
);

export const CONFIGURATION_DEFAULTS_REDUCER_ATOM = atomWithReducer(
  {},
  configurationDefaultsReducer
);
