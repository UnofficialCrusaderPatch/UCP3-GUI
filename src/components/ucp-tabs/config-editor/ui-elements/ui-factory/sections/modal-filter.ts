import { createContext } from 'react';

/** Undefined outside a modal: global search retains complete ordinary groups. */
export const ModalFilterContext = createContext<Set<number> | undefined>(
  undefined,
);
export const ModalQueryContext = createContext<string | undefined>(undefined);
