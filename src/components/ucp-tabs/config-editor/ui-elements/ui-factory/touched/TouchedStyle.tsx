import { CREATOR_MODE_ATOM } from 'function/gui-settings/settings';
import { getStore } from 'hooks/jotai/base';

function createTouchedStyle(touched: boolean, version?: number) {
  if (getStore().get(CREATOR_MODE_ATOM) === false) return ``;
  if (!touched) return ``;
  if (version === 1) {
    return `border-4 border-start border-primary`;
  }
  return `ucp-touched`;
}

// eslint-disable-next-line import/prefer-default-export
export { createTouchedStyle };
