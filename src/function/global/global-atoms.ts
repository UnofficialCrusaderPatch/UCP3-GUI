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
const configurationWarningsReducer = KeyValueReducer<Warning>();
const extensionsReducer = ArrayReducer<Extension>();
const activeExtensionsReducer = ArrayReducer<Extension>();
const configurationDefaultsReducer = KeyValueReducer<unknown>();

const extensionStateReducer = (
  oldState: ExtensionsState,
  newState: Partial<ExtensionsState>
): ExtensionsState => {
  const state = { ...oldState, ...newState };
  return state;
};

// normal atoms

export const INIT_DONE = atom(false);
export const INIT_RUNNING = atom(false);
export const UCP_CONFIG_FILE_ATOM = atom('');
export const GAME_FOLDER_ATOM = atom(''); // unused

// reducer atoms

export const CONFIGURATION_REDUCER_ATOM = atomWithReducer(
  {},
  configurationReducer
);

export const CONFIGURATION_TOUCHED_REDUCER_ATOM = atomWithReducer(
  {},
  configurationTouchedReducer
);

export const CONFIGURATION_WARNINGS_REDUCER_ATOM = atomWithReducer(
  {},
  configurationWarningsReducer
);

export const CONFIGURATION_DEFAULTS_REDUCER_ATOM = atomWithReducer(
  {},
  configurationDefaultsReducer
);

export const EXTENSION_STATE_REDUCER_ATOM = atomWithReducer(
  {
    extensions: [],
    onlineAvailableExtensions: [],
    installedExtensions: [],
    activeExtensions: [],
    explicitlyActivatedExtensions: [],
    configuration: {},
  },
  extensionStateReducer
);

type ConfigurationLock = {
  lockedBy: string;
  lockedValue: unknown;
};

const configurationLocksReducer = KeyValueReducer<ConfigurationLock>();

export const CONFIGURATION_LOCKS_REDUCER_ATOM = atomWithReducer(
  {},
  configurationLocksReducer
);
