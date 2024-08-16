import { focusAtom } from 'jotai-optics';
import { atom } from 'jotai';
import { EXTENSION_STATE_INTERFACE_ATOM } from './state';
import { Extension } from '../../../config/ucp/common';

// eslint-disable-next-line import/prefer-default-export
export const ACTIVE_EXTENSIONS_ATOM = focusAtom(
  EXTENSION_STATE_INTERFACE_ATOM,
  (optic) => optic.prop('activeExtensions'),
);

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
