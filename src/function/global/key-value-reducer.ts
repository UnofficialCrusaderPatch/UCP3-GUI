export function KeyValueReducer<Type>() {
  return (
    state: KeyValueReducerState<Type>,
    action: KeyValueReducerArgs<Type>,
  ) => {
    if (action.type === 'clear-all') {
      return {};
    }
    if (action.type === 'clear-key') {
      const { key } = action;
      const { [key]: forgottenValue, ...remainder } = state;

      return remainder;
    }
    if (action.type === 'clear-keys') {
      const { keys } = action;

      return Object.fromEntries(
        Object.entries(state).filter(([key]) => keys.indexOf(key) === -1),
      );
    }
    if (action.type === 'reset') {
      return { ...action.value };
    }
    if (action.type === 'set-multiple') {
      return { ...state, ...(action.value as object) };
    }
    throw new Error(`Unknown configuration action type`);
  };
}
export type KeyValueReducerState<Type> = {
  [key: string]: Type;
};
export type KeyValueReducerArgs<Type> =
  | {
      type: 'clear-key';
      key: string;
    }
  | {
      type: 'clear-keys';
      keys: string[];
    }
  | {
      type: 'set-multiple';
      value: KeyValueReducerState<Type>;
    }
  | {
      type: 'reset';
      value: KeyValueReducerState<Type>;
    }
  | {
      type: 'clear-all';
    };
