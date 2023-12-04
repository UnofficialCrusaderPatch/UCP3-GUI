import { Extension } from 'config/ucp/common';
import { loadable } from 'jotai/utils';
import { exists } from '@tauri-apps/api/fs';
import {
  ArrayReducerArgs,
  ArrayReducerState,
  ConfigurationQualifier,
  ExtensionsState,
  GeneralOkCancelModalWindow,
  GeneralOkModalWindow,
  KeyValueReducerArgs,
  KeyValueReducerState,
  Warning,
} from './types';

// eslint-disable-next-line import/prefer-default-export
export function KeyValueReducer<Type>() {
  return (
    state: KeyValueReducerState<Type>,
    action: KeyValueReducerArgs<Type>,
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

function ArrayReducer<Type>() {
  return (
    _state: ArrayReducerState<Type>,
    newState: ArrayReducerArgs<Type>,
  ) => [...newState];
}
