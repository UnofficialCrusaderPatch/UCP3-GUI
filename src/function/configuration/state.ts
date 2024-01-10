import { atom } from 'jotai';
import { atomWithReducer } from 'jotai/utils';
import { KeyValueReducer } from '../global/KeyValueReducer';
import { Warning } from '../global/types';

const configurationReducer = KeyValueReducer<unknown>();
const configurationDefaultsReducer = KeyValueReducer<unknown>();
const configurationUserReducer = KeyValueReducer<unknown>();
const configurationTouchedReducer = KeyValueReducer<boolean>();
const configurationWarningsReducer = KeyValueReducer<Warning>();
const configurationQualifierReducer = KeyValueReducer<ConfigurationQualifier>();

export const UCP_CONFIG_FILE_ATOM = atom(''); // reducer atoms
export const CONFIGURATION_REDUCER_ATOM = atomWithReducer(
  {},
  configurationReducer,
);
export const CONFIGURATION_DEFAULTS_REDUCER_ATOM = atomWithReducer(
  {},
  configurationDefaultsReducer,
);
export const CONFIGURATION_USER_REDUCER_ATOM = atomWithReducer(
  {},
  configurationUserReducer,
);
export const CONFIGURATION_TOUCHED_REDUCER_ATOM = atomWithReducer(
  {},
  configurationTouchedReducer,
);
export const CONFIGURATION_WARNINGS_REDUCER_ATOM = atomWithReducer(
  {},
  configurationWarningsReducer,
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
export type ConfigurationQualifier = 'required' | 'suggested';
