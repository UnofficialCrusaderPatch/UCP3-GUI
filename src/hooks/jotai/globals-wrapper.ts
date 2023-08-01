// these simply wrap the global atoms into hooks, the return of them is unchanged
// The use...Value only return the value
// the useSet... only return the set funciton, additionally,
// they also prevent not needed rerenders if the value is only set

import * as globalAtoms from 'function/global/global-atoms';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';

// "normal" atoms

export function useInitDone() {
  return useAtom(globalAtoms.INIT_DONE);
}
export function useInitDoneValue() {
  return useAtomValue(globalAtoms.INIT_DONE);
}
export function useSetInitDone() {
  return useSetAtom(globalAtoms.INIT_DONE);
}

export function useInitRunning() {
  return useAtom(globalAtoms.INIT_RUNNING);
}
export function useInitRunningValue() {
  return useAtomValue(globalAtoms.INIT_RUNNING);
}
export function useSetInitRunning() {
  return useSetAtom(globalAtoms.INIT_RUNNING);
}

export function useUcpConfigFile() {
  return useAtom(globalAtoms.UCP_CONFIG_FILE_ATOM);
}
export function useUcpConfigFileValue() {
  return useAtomValue(globalAtoms.UCP_CONFIG_FILE_ATOM);
}
export function useSetUcpConfigFile() {
  return useSetAtom(globalAtoms.UCP_CONFIG_FILE_ATOM);
}

export function useFolder() {
  return useAtom(globalAtoms.GAME_FOLDER_ATOM);
}
export function useFolderValue() {
  return useAtomValue(globalAtoms.GAME_FOLDER_ATOM);
}
export function useSetFolder() {
  return useSetAtom(globalAtoms.GAME_FOLDER_ATOM);
}

// reducer atoms

export function useConfigurationReducer() {
  return useAtom(globalAtoms.CONFIGURATION_REDUCER_ATOM);
}
export function useConfiguration() {
  return useAtomValue(globalAtoms.CONFIGURATION_REDUCER_ATOM);
}
export function useSetConfiguration() {
  return useSetAtom(globalAtoms.CONFIGURATION_REDUCER_ATOM);
}

export function useConfigurationTouchedReducer() {
  return useAtom(globalAtoms.CONFIGURATION_TOUCHED_REDUCER_ATOM);
}
export function useConfigurationTouched() {
  return useAtomValue(globalAtoms.CONFIGURATION_TOUCHED_REDUCER_ATOM);
}
export function useSetConfigurationTouched() {
  return useSetAtom(globalAtoms.CONFIGURATION_TOUCHED_REDUCER_ATOM);
}

export function useConfigurationWarningsReducer() {
  return useAtom(globalAtoms.CONFIGURATION_WARNINGS_REDUCER_ATOM);
}
export function useConfigurationWarnings() {
  return useAtomValue(globalAtoms.CONFIGURATION_WARNINGS_REDUCER_ATOM);
}
export function useSetConfigurationWarnings() {
  return useSetAtom(globalAtoms.CONFIGURATION_WARNINGS_REDUCER_ATOM);
}

export function useConfigurationDefaultsReducer() {
  return useAtom(globalAtoms.CONFIGURATION_DEFAULTS_REDUCER_ATOM);
}
export function useConfigurationDefaults() {
  return useAtomValue(globalAtoms.CONFIGURATION_DEFAULTS_REDUCER_ATOM);
}
export function useSetConfigurationDefaults() {
  return useSetAtom(globalAtoms.CONFIGURATION_DEFAULTS_REDUCER_ATOM);
}

export function useExtensionStateReducer() {
  return useAtom(globalAtoms.EXTENSION_STATE_REDUCER_ATOM);
}
export function useExtensionState() {
  return useAtomValue(globalAtoms.EXTENSION_STATE_REDUCER_ATOM);
}
export function useSetExtensionState() {
  return useSetAtom(globalAtoms.EXTENSION_STATE_REDUCER_ATOM);
}

export function useConfigurationLocksReducer() {
  return useAtom(globalAtoms.CONFIGURATION_LOCKS_REDUCER_ATOM);
}
export function useConfigurationLocks() {
  return useAtomValue(globalAtoms.CONFIGURATION_LOCKS_REDUCER_ATOM);
}
export function useSetConfigurationLocks() {
  return useSetAtom(globalAtoms.CONFIGURATION_LOCKS_REDUCER_ATOM);
}
