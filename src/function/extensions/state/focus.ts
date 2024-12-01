import { focusAtom } from 'jotai-optics';
import { atom } from 'jotai';
import { EXTENSION_STATE_INTERFACE_ATOM } from './state';
import { Extension } from '../../../config/ucp/common';
import { EXTENSION_EDITOR_STATE_ATOM } from '../../../components/ucp-tabs/common/extension-editor/extension-editor-state';

// eslint-disable-next-line import/prefer-default-export
export const ACTIVE_EXTENSIONS_ATOM = focusAtom(
  EXTENSION_STATE_INTERFACE_ATOM,
  (optic) => optic.prop('activeExtensions'),
);

/**
 * Prepends editor extension if relevant to active extensions list
 */
export const ACTIVE_EXTENSIONS_FULL_ATOM = atom<Extension[]>((get) => {
  const activeExtensions = get(ACTIVE_EXTENSIONS_ATOM);
  const editorState = get(EXTENSION_EDITOR_STATE_ATOM);

  if (editorState.state === 'inactive') {
    return activeExtensions;
  }

  return [editorState.extension, ...activeExtensions];
});

export const ACTIVE_EXTENSIONS_ID_ATOM = atom<string[]>((get) => {
  const result = get(ACTIVE_EXTENSIONS_ATOM).map(
    (ext: Extension) => `${ext.name}@${ext.version}`,
  );
  return result;
});

export const EXTENSIONS_STATE_TREE_ATOM = focusAtom(
  EXTENSION_STATE_INTERFACE_ATOM,
  (optic) => optic.prop('tree'),
);

export const EXTENSIONS_ATOM = focusAtom(
  EXTENSION_STATE_INTERFACE_ATOM,
  (optic) => optic.prop('extensions'),
);
