import { getStore } from '../../hooks/jotai/base';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_WARNINGS_REDUCER_ATOM,
  CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from './state';

// eslint-disable-next-line import/prefer-default-export
export function clearConfiguration() {
  getStore().set(CONFIGURATION_FULL_REDUCER_ATOM, {
    type: 'clear-all',
  });
  getStore().set(CONFIGURATION_USER_REDUCER_ATOM, {
    type: 'clear-all',
  });
  // currently simply reset:
  getStore().set(CONFIGURATION_TOUCHED_REDUCER_ATOM, {
    type: 'clear-all',
  });
  getStore().set(CONFIGURATION_WARNINGS_REDUCER_ATOM, {
    type: 'clear-all',
  });
  getStore().set(CONFIGURATION_QUALIFIER_REDUCER_ATOM, {
    type: 'clear-all',
  });
}
