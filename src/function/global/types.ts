import { Extension } from 'config/ucp/common';
import { ConfigMetaObjectDB } from 'config/ucp/config-merge/objects';

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
  /**
   * Array of Extension keeping track of all available Extensions that were discovered at some point
   */
  extensions: Extension[];

  /**
   * Extensions that are available in an online repository but currently not installed.
   */
  onlineAvailableExtensions: Extension[];

  /**
   *  Extensions that are installed and can thus be activated.
   */
  installedExtensions: Extension[];

  /**
   * Extensions that are currently active. Used to determine UI option display
   */
  activeExtensions: Extension[];

  /**
   * Extensions that are explicitly set to active
   */
  explicitlyActivatedExtensions: Extension[];

  /**
   * Configuration that is associated with the current extensions ordering
   */
  configuration: ConfigMetaObjectDB;
};
