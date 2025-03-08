import { atomWithStorage } from 'jotai/utils';

export type UITabs =
  | 'overview'
  | 'extensions'
  | 'config'
  | 'launch'
  | 'content-manager';

export const CURRENT_DISPLAYED_TAB = atomWithStorage<UITabs>(
  'guiTab',
  'overview',
);
