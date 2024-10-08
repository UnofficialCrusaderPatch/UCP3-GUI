import { Extension } from '../../config/ucp/common';
import { ConfigurationState } from '../configuration/state';
import { ExtensionDependencyTree } from './dependency-management/dependency-resolution';

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
   * Extensions that are currently active. Used to determine UI option display.
   * Sorted in display order
   */
  activeExtensions: Extension[];

  /**
   * Extensions that are explicitly set to active
   * Sorted in display order
   */
  explicitlyActivatedExtensions: Extension[];

  /**
   * Configuration that is associated with the current extensions ordering
   */
  configuration: ConfigurationState;

  tree: ExtensionDependencyTree;
};
