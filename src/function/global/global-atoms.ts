import { Extension } from 'config/ucp/common';
import { atomWithReducer, atomWithStorage, loadable } from 'jotai/utils';
import { atom } from 'jotai';
import { compare } from 'semver';
import { ExtensionTree } from 'function/extensions/dependency-management/dependency-resolution';
import { exists } from '@tauri-apps/api/fs';
import {
  ArrayReducerArgs,
  ArrayReducerState,
  ConfigurationQualifier,
  ExtensionsState,
  GeneralOkCancelModalWindow,
  GeneralOkModalWindow,
  KeyValueReducerArgs,
  KeyValueReducerState,
  Warning,
} from './types';

function KeyValueReducer<Type>() {
  return (
    state: KeyValueReducerState<Type>,
    action: KeyValueReducerArgs<Type>,
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
    newState: ArrayReducerArgs<Type>,
  ) => [...newState];
}

const configurationReducer = KeyValueReducer<unknown>();
const configurationTouchedReducer = KeyValueReducer<boolean>();
const configurationWarningsReducer = KeyValueReducer<Warning>();
const extensionsReducer = ArrayReducer<Extension>();
const activeExtensionsReducer = ArrayReducer<Extension>();
const configurationDefaultsReducer = KeyValueReducer<unknown>();

const configurationQualifierReducer = KeyValueReducer<ConfigurationQualifier>();

const extensionStateReducer = (
  oldState: ExtensionsState,
  newState: Partial<ExtensionsState>,
): ExtensionsState => {
  const state = { ...oldState, ...newState };
  return state;
};

// normal atoms

export const INIT_DONE = atom(false);
export const INIT_RUNNING = atom(false);
export const UCP_CONFIG_FILE_ATOM = atom('');
export const GAME_FOLDER_ATOM = atom('');

// reducer atoms

export const CONFIGURATION_REDUCER_ATOM = atomWithReducer(
  {},
  configurationReducer,
);

export const CONFIGURATION_TOUCHED_REDUCER_ATOM = atomWithReducer(
  {},
  configurationTouchedReducer,
);

export const CONFIGURATION_WARNINGS_REDUCER_ATOM = atomWithReducer(
  {},
  configurationWarningsReducer,
);

export const CONFIGURATION_DEFAULTS_REDUCER_ATOM = atomWithReducer(
  {},
  configurationDefaultsReducer,
);

export const EXTENSION_STATE_REDUCER_ATOM = atomWithReducer(
  {
    extensions: [],
    onlineAvailableExtensions: [],
    installedExtensions: [],
    activeExtensions: [],
    explicitlyActivatedExtensions: [],
    tree: new ExtensionTree([]),
    configuration: {
      statusCode: 0,
      errors: [],
      warnings: [],
      state: {},
    },
  },
  extensionStateReducer,
);

export type ConfigurationLock = {
  lockedBy: string;
  lockedValue: unknown;
};

const configurationLocksReducer = KeyValueReducer<ConfigurationLock>();

export const CONFIGURATION_LOCKS_REDUCER_ATOM = atomWithReducer(
  {},
  configurationLocksReducer,
);

export type ConfigurationSuggestion = {
  suggestedBy: string;
  suggestedValue: unknown;
};

const configurationSuggestionsReducer =
  KeyValueReducer<ConfigurationSuggestion>();

export const CONFIGURATION_SUGGESTIONS_REDUCER_ATOM = atomWithReducer(
  {},
  configurationSuggestionsReducer,
);

export const CONFIGURATION_QUALIFIER_REDUCER_ATOM = atomWithReducer(
  {},
  configurationQualifierReducer,
);

export type PreferredExtensionVersionDictionary = {
  [extensionName: string]: string;
};

export const PREFERRED_EXTENSION_VERSION_ATOM =
  atom<PreferredExtensionVersionDictionary>({});

export type AvailableExtensionVersionsDictionary = {
  [extensionName: string]: string[];
};

export const AVAILABLE_EXTENSION_VERSIONS_ATOM =
  atom<AvailableExtensionVersionsDictionary>((get) => {
    const { extensions } = get(EXTENSION_STATE_REDUCER_ATOM);

    const { tree } = get(EXTENSION_STATE_REDUCER_ATOM);

    return Object.fromEntries(
      Array.from(new Set(extensions.map((e) => e.name))).map((name) => [
        name,
        tree.allVersionsForName(name),
      ]),
    ) as AvailableExtensionVersionsDictionary;
  });

export const STATUS_BAR_MESSAGE_ATOM = atom<string | undefined>(undefined);

const DOES_UCP_FOLDER_EXIST_ASYNC_ATOM = atom(async (get) => {
  const folder = get(GAME_FOLDER_ATOM);
  if (
    folder === undefined ||
    folder === null ||
    folder.length === 0 ||
    folder === ''
  )
    return false;

  const result = await exists(`${folder}/ucp`);
  return result;
});

export const DOES_UCP_FOLDER_EXIST_ATOM = loadable(
  DOES_UCP_FOLDER_EXIST_ASYNC_ATOM,
);
