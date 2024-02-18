import { atom } from 'jotai';
import { Extension } from '../../../../config/ucp/common';

export type ActiveExtensionEditorState = {
  state: 'active';
  extension: Extension;
};

export type InactiveExtensionState = {
  state: 'inactive';
};

export type ExtensionEditorState =
  | ActiveExtensionEditorState
  | InactiveExtensionState;

export const EXTENSION_EDITOR_STATE_ATOM = atom<ExtensionEditorState>({
  state: 'inactive',
});
