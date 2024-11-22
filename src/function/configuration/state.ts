import { atom } from 'jotai';
import { atomWithReducer } from 'jotai/utils';
import {
  KeyValueReducer,
  KeyValueReducerState,
} from '../global/key-value-reducer';
import { Warning } from '../global/types';
import { ConfigMetaObjectDB } from '../../config/ucp/config-merge/objects';
import { Override } from './overrides';

const configurationFullReducer = KeyValueReducer<unknown>();
// const configurationDefaultsReducer = KeyValueReducer<unknown>();
const configurationUserReducer = KeyValueReducer<unknown>();
const configurationTouchedReducer = KeyValueReducer<boolean>();
const configurationWarningsReducer = KeyValueReducer<Warning>();
const configurationQualifierReducer = KeyValueReducer<ConfigurationQualifier>();

export const UCP_CONFIG_FILE_ATOM = atom(''); // reducer atoms

// TODO: make it read only and write only to the user config
export const CONFIGURATION_FULL_REDUCER_ATOM = atomWithReducer(
  {},
  configurationFullReducer,
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
export type ConfigurationSuggestion = {
  suggestedBy: string;
  suggestedValue: unknown;
};
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
  defined: { [key: string]: unknown };
  locks: KeyValueReducerState<ConfigurationLock>;
  suggestions: KeyValueReducerState<ConfigurationSuggestion>;
};

export function createEmptyConfigurationState() {
  return {
    state: {},
    warnings: [],
    overrides: new Map<string, Override[]>(),
    errors: [],
    statusCode: -1,
    defined: {},
    locks: {},
    suggestions: {},
  } as ConfigurationState;
}
