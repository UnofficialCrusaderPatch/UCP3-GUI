import { KeyValueReducer } from 'function/global/global-atoms';
import { ConfigurationQualifier, Warning } from 'function/global/types';
import { atom } from 'jotai';
import { atomWithReducer } from 'jotai/utils';

export const configurationReducer = KeyValueReducer<unknown>();
const configurationTouchedReducer = KeyValueReducer<boolean>();
const configurationWarningsReducer = KeyValueReducer<Warning>();
const configurationDefaultsReducer = KeyValueReducer<unknown>();

const configurationQualifierReducer = KeyValueReducer<ConfigurationQualifier>();

export const UCP_CONFIG_FILE_ATOM = atom(''); // reducer atoms
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
export type ConfigurationLock = {
  lockedBy: string;
  lockedValue: unknown;
};
export const configurationLocksReducer = KeyValueReducer<ConfigurationLock>();
export const CONFIGURATION_LOCKS_REDUCER_ATOM = atomWithReducer(
  {},
  configurationLocksReducer,
);
export type ConfigurationSuggestion = {
  suggestedBy: string;
  suggestedValue: unknown;
};
export const configurationSuggestionsReducer =
  KeyValueReducer<ConfigurationSuggestion>();
export const CONFIGURATION_SUGGESTIONS_REDUCER_ATOM = atomWithReducer(
  {},
  configurationSuggestionsReducer,
);
export const CONFIGURATION_QUALIFIER_REDUCER_ATOM = atomWithReducer(
  {},
  configurationQualifierReducer,
);
export type AvailableExtensionVersionsDictionary = {
  [extensionName: string]: string[];
};
