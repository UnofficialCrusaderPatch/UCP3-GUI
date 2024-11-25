import { atom } from 'jotai';
import { EXTENSION_STATE_REDUCER_ATOM } from '../extensions/state/state';
import { KeyValueReducer } from '../global/key-value-reducer';
import { ConfigurationSuggestion } from './state';

/**
 * Default config values as defined by the UI elements themselves AND
 * the active extensions' config values.
 *
 * Primary use is to reset changed UI elements back to the specified value
 * when user customisations are thrown away.
 */
export const CONFIGURATION_DEFAULTS_REDUCER_ATOM = atom((get) => {
  return get(EXTENSION_STATE_REDUCER_ATOM).configuration.defined;
});

export const CONFIGURATION_LOCKS_REDUCER_ATOM = atom((get) => {
  return get(EXTENSION_STATE_REDUCER_ATOM).configuration.locks;
});

export const configurationSuggestionsReducer =
  KeyValueReducer<ConfigurationSuggestion>();
export const CONFIGURATION_SUGGESTIONS_REDUCER_ATOM = atom((get) => {
  return get(EXTENSION_STATE_REDUCER_ATOM).configuration.suggestions;
});
