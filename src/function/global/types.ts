import { Extension } from 'config/ucp/common';

export type KeyValueReducerState<Type> = {
  [key: string]: Type;
};

export type KeyValueReducerArgs<Type> = {
  type: string;
  value: KeyValueReducerState<Type>;
};

export type ArrayReducerArgs<Type> = Type[];
export type ArrayReducerState<Type> = Type[];

export type Warning = {
  text: string;
  level: 'error' | 'warning' | 'info';
};

export type UIDefinition = {
  flat: object[];
  hierarchical: { elements: object[]; sections: { [key: string]: object } };
};

export type ExtensionsState = {
  allExtensions: Extension[];
  // Explicitly activated
  activatedExtensions: Extension[];
  activeExtensions: Extension[];
  installedExtensions: Extension[];
};
