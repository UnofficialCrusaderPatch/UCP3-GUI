import { atom } from 'jotai';
import { DEFAULT_CONTENT_STATE } from '../../../../function/content/state/content-state';
import { DEFAULT_CONTENT_INTERFACE_STATE } from '../../../../function/content/state/content-interface-state';

// eslint-disable-next-line import/prefer-default-export
export const CONTENT_STATE_ATOM = atom(DEFAULT_CONTENT_STATE);
export const CONTENT_INTERFACE_STATE_ATOM = atom(
  DEFAULT_CONTENT_INTERFACE_STATE,
);
