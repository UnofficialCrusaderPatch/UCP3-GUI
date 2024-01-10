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
export type KeyValueReducerState<Type> = {
  [key: string]: Type;
};
export type KeyValueReducerArgs<Type> = {
  type: string;
  value: KeyValueReducerState<Type>;
};
