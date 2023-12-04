import { ExtensionTree } from 'function/extensions/dependency-management/dependency-resolution';
import { atomWithReducer } from 'jotai/utils';
import { propagateActiveExtensionsChange } from 'function/extensions/state/change';
import { atom } from 'jotai';
import { ExtensionsState } from 'function/global/types';

export const extensionStateReducer = (
  oldState: ExtensionsState,
  newState: Partial<ExtensionsState>,
): ExtensionsState => {
  const state = { ...oldState, ...newState };
  return state;
};

export const EXTENSION_STATE_INTERNAL_ATOM = atomWithReducer(
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

export const EXTENSION_STATE_INTERFACE_ATOM = atom(
  (get) => get(EXTENSION_STATE_INTERNAL_ATOM),
  (get, set, newValue: ExtensionsState) => {
    propagateActiveExtensionsChange(newValue);
    set(EXTENSION_STATE_INTERNAL_ATOM, newValue);
  },
);

export const EXTENSION_STATE_REDUCER_ATOM = EXTENSION_STATE_INTERFACE_ATOM;
