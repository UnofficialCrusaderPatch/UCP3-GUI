import { createContext } from 'react';
import { Extension } from '../common/config/common';

type KeyValueReducerState<Type> = {
  [key: string]: Type;
};

type KeyValueReducerArgs<Type> = {
  type: string;
  value: KeyValueReducerState<Type>;
};

function KeyValueReducer<Type>() {
  return (
    state: KeyValueReducerState<Type>,
    action: KeyValueReducerArgs<Type>
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

type ArrayReducerArgs<Type> = Type[];
type ArrayReducerState<Type> = Type[];

function ArrayReducer<Type>() {
  return (state: ArrayReducerState<Type>, newState: ArrayReducerArgs<Type>) => {
    return [...newState];
  };
}

const configurationReducer = KeyValueReducer<unknown>();
const configurationTouchedReducer = KeyValueReducer<boolean>();

type Warning = {
  text: string;
  level: 'error' | 'warning' | 'info';
};
const configurationWarningReducer = KeyValueReducer<Warning>();

const activeExtensionsReducer = ArrayReducer<Extension>();

const configurationDefaultsReducer = KeyValueReducer<unknown>();

type UIDefinition = {
  flat: object[];
  hierarchical: { elements: object[]; sections: { [key: string]: object } };
};

type GlobalStateType = {
  configurationDefaults: KeyValueReducerState<unknown>;
  setConfigurationDefaults: (action: KeyValueReducerArgs<Warning>) => void;
  configurationWarnings: KeyValueReducerState<Warning>;
  setConfigurationWarnings: (action: KeyValueReducerArgs<Warning>) => void;
  configuration: KeyValueReducerState<unknown>;
  setConfiguration: (action: KeyValueReducerArgs<unknown>) => void;
  configurationTouched: KeyValueReducerState<boolean>;
  setConfigurationTouched: (action: KeyValueReducerArgs<boolean>) => void;
  extensions: Extension[];
  activeExtensions: Extension[];
  setActiveExtensions: (newState: ArrayReducerArgs<Extension>) => void;
  uiDefinition: UIDefinition;
  folder: string;
  file: string;
};

const GlobalState = createContext<GlobalStateType>({
  configurationDefaults: {},
  setConfigurationDefaults: () => {},
  configurationWarnings: {},
  setConfigurationWarnings: () => {},
  configuration: {},
  setConfiguration: () => {},
  configurationTouched: {},
  setConfigurationTouched: () => {},
  extensions: [],
  activeExtensions: [],
  setActiveExtensions: () => {},
  uiDefinition: { flat: [], hierarchical: { elements: [], sections: {} } },
  folder: '',
  file: '',
});

export {
  GlobalState,
  configurationReducer,
  configurationTouchedReducer,
  configurationWarningReducer,
  activeExtensionsReducer,
  configurationDefaultsReducer,

  KeyValueReducer,
}; 
export type {
  GlobalStateType,
  Warning,
  UIDefinition
};
