import { atom } from 'jotai';

export type UITabs =
  | 'overview'
  | 'extensions'
  | 'config'
  | 'launch'
  | 'content-manager';

export const CURRENT_DISPLAYED_TAB = atom<UITabs>('overview');
