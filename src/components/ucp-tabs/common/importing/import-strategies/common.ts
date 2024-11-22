import { ConfigFile } from '../../../../../config/ucp/common';
import Logger from '../../../../../util/scripts/logging';
import { ExtensionsState } from '../../../../../function/extensions/extensions-state';

export const LOGGER = new Logger('import-strategies.ts');

export function sanitizeVersionRange(rangeString: string) {
  if (rangeString.indexOf('==') !== -1) {
    return rangeString.replaceAll('==', '');
  }
  return rangeString;
}

export type Success = {
  status: 'ok';
  newExtensionsState: ExtensionsState;
};

export type GenericFailure = {
  status: 'error';
  messages: string[];
  code: 'GENERIC';
};

export type MissingDependenciesFailure = {
  status: 'error';
  messages: string[];
  code: 'MISSING_DEPENDENCIES' | 'MISSING_DEPENDENCIES_OR_WRONG_ORDER';
  dependencies: string[];
};

export type StrategyResult =
  | Success
  | (GenericFailure | MissingDependenciesFailure);

export type Strategy = (
  newExtensionsState: ExtensionsState,
  config: ConfigFile,
  setConfigStatus: (arg0: string) => void,
) => Promise<StrategyResult>;
