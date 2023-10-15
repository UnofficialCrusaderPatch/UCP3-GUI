// UNUSED

import { getStore } from 'hooks/jotai/base';
import { WritableAtom, useAtom, useAtomValue, useSetAtom } from 'jotai';

/** *********************************** */
// Proof of concept Atom Function class //
/** *********************************** */

// taken from jotai
type SetAtom<Args extends unknown[], Result> = (...args: Args) => Result;

// https://stackoverflow.com/a/63029283
type DropFirst<T extends unknown[]> = T extends [unknown, ...infer U]
  ? U
  : never;

// simple class to wrap atoms to provide the typical functions
class AtomWrapper<Value, Args extends unknown[], Result> {
  #atom;

  use: (
    ...args: DropFirst<Parameters<typeof useAtom>>
  ) => [Awaited<Value>, SetAtom<Args, Result>];

  useValue: (
    ...args: DropFirst<Parameters<typeof useAtomValue>>
  ) => Awaited<Value>;

  useSet: (
    ...args: DropFirst<Parameters<typeof useSetAtom>>
  ) => SetAtom<Args, Result>;

  constructor(atom: WritableAtom<Value, Args, Result>) {
    this.#atom = atom;

    // bind, so that function structure is proper
    this.use = useAtom.bind(undefined, this.#atom);
    this.useValue = useAtomValue.bind(undefined, this.#atom);
    this.useSet = (useSetAtom as typeof useSetAtom<Value, Args, Result>).bind(
      undefined,
      this.#atom,
    );
  }

  storeGet() {
    return getStore().get(this.#atom);
  }

  storeSet(...args: Args) {
    getStore().set(this.#atom, ...args);
  }
}

export default AtomWrapper;
