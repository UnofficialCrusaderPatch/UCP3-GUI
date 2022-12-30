// these simply wrap the global atoms into hooks, the return of them is unchanged

import * as globalAtoms from 'function/global/global-atoms';
import { useAtom } from 'jotai';

// "normal" atoms

export function useInitDone() {
  return useAtom(globalAtoms.INIT_DONE);
}

export function useFile() {
  return useAtom(globalAtoms.FILE_ATOM);
}

export function useFolder() {
  return useAtom(globalAtoms.FOLDER_ATOM);
}

// reducer atoms

export function useConfigurationReducer() {
  return useAtom(globalAtoms.CONFIGURATION_REDUCER_ATOM);
}

export function useConfigurationTouchedReducer() {
  return useAtom(globalAtoms.CONFIGURATION_TOUCHED_REDUCER_ATOM);
}

export function useConfigurationWarningsReducer() {
  return useAtom(globalAtoms.CONFIGURATION_WARNINGS_REDUCER_ATOM);
}

export function useExtensionsReducer() {
  return useAtom(globalAtoms.EXTENSIONS_REDUCER_ATOM);
}

export function useActiveExtensionsReducer() {
  return useAtom(globalAtoms.ACTIVE_EXTENSIONS_REDUCER_ATOM);
}

export function useConfigurationDefaultsReducer() {
  return useAtom(globalAtoms.CONFIGURATION_DEFAULTS_REDUCER_ATOM);
}

export function useExtensionStateReducer() {
  return useAtom(globalAtoms.EXTENSION_STATE_REDUCER_ATOM);
}
