export function ArrayReducer<Type>() {
  return (
    _state: ArrayReducerState<Type>,
    newState: ArrayReducerArgs<Type>,
  ) => [...newState];
}
export type ArrayReducerArgs<Type> = Type[];
export type ArrayReducerState<Type> = Type[];
