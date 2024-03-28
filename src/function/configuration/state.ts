import { atom } from 'jotai';
import { atomWithReducer } from 'jotai/utils';
import { KeyValueReducer } from '../global/key-value-reducer';
import { Warning } from '../global/types';
import { ConfigMetaObjectDB } from '../../config/ucp/config-merge/objects';
import { Override } from './overrides';

const configurationFullReducer = KeyValueReducer<unknown>();
const configurationDefaultsReducer = KeyValueReducer<unknown>();
const configurationUserReducer = KeyValueReducer<unknown>();
const configurationTouchedReducer = KeyValueReducer<boolean>();
const configurationWarningsReducer = KeyValueReducer<Warning>();
const configurationQualifierReducer = KeyValueReducer<ConfigurationQualifier>();

export const UCP_CONFIG_FILE_ATOM = atom(''); // reducer atoms
export const CONFIGURATION_FULL_REDUCER_ATOM = atomWithReducer(
  {},
  configurationFullReducer,
);
/**
 * Default config values as defined by the UI elements themselves AND
 * the active extensions' config values.
 *
 * Primary use is to reset changed UI elements back to the specified value
 * when user customisations are thrown away.
 */
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
export type ConfigurationQualifier = 'required' | 'suggested' | 'unspecified';
export type ConfigurationState = {
  state: ConfigMetaObjectDB;
  warnings: string[];
  overrides: Map<string, Override[]>;
  errors: string[];
  statusCode: number;
};
