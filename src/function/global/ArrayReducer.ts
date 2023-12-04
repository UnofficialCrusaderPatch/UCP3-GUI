import { ArrayReducerArgs, ArrayReducerState } from './types';

// eslint-disable-next-line import/prefer-default-export
export function ArrayReducer<Type>() {
  return (
    _state: ArrayReducerState<Type>,
    newState: ArrayReducerArgs<Type>,
  ) => [...newState];
}
