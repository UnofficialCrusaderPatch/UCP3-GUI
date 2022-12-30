// these simply wrap the global atoms into hooks, the return of them is unchanged

import * as globalAtoms from 'function/global/global-atoms';
import { useAtom } from 'jotai';

// "normal" atoms

export function useFile() {
  return useAtom(globalAtoms.FILE_ATOM);
}

export function useFolder() {
  return useAtom(globalAtoms.FOLDER_ATOM);
}

export function useExtensions() {
  return useAtom(globalAtoms.EXTENSIONS_ATOM);
}

export function useExtensionState() {
  return useAtom(globalAtoms.EXTENSION_STATE_ATOM);
}

// reducer atoms

export function useConfigurationReducer() {
  return useAtom(globalAtoms.CONFIGURATION_REDUCER_ATOM);
}

export function useConfigurationTouchedReducer() {
  return useAtom(globalAtoms.CONFIGURATION_TOUCHED_REDUCER_ATOM);
}

export function useConfigurationWarningReducer() {
  return useAtom(globalAtoms.CONFIGURATION_WARNING_REDUCER_ATOM);
}

export function useActiveExtensionsReducer() {
  return useAtom(globalAtoms.ACTIVE_EXTENSIONS_REDUCER_ATOM);
}

export function useConfigurationDefaultsReducer() {
  return useAtom(globalAtoms.CONFIGURATION_DEFAULTS_REDUCER_ATOM);
}
