import { Getter, atom, getDefaultStore, useAtom, useSetAtom } from 'jotai';
import { loadable } from 'jotai/utils';
import Option from '../../util/structs/option';
import Result from '../../util/structs/result';

export function getStore() {
  return getDefaultStore();
}

// not exported in jotai
type Loadable<T> =
  | {
      state: 'loading';
    }
  | {
      state: 'hasError';
      error: unknown;
    }
  | {
      state: 'hasData';
      data: Awaited<T>;
    };

// https://jotai.org/docs/recipes/atom-with-refresh
// can trigger, but not await refresh
// if result needed, follow set with a awaited get
export function atomWithRefresh<T>(fn: (get: Getter) => T) {
  const refreshCounter = atom(0);

  return atom(
    (get) => {
      get(refreshCounter);
      return fn(get);
    },
    (_, set) => set(refreshCounter, (i) => i + 1),
  );
}

// https://jotai.org/docs/advanced-recipes/atom-creators#atom-with-refresh
function asyncAtomWithMutate<T, U extends unknown[]>(
  fn: (previousValue?: T, ...args: U) => T | Promise<T>,
  ...initialArgs: U
) {
  const previousValue = atom<T | undefined>(undefined);
  const argsAtom = atom(initialArgs);

  const mutateableAtom = atom(
    async (get) => fn(get(previousValue), ...get(argsAtom)),
    async (_get, set, args: U) => {
      set(previousValue, await _get(mutateableAtom));
      set(argsAtom, args);
    },
  );
  return mutateableAtom;
}

function resolveLoadableState<T>(
  loadableState: Loadable<T>,
): Option<Result<T, unknown>> {
  switch (loadableState.state) {
    case 'hasData':
      return Option.of(Result.ok(loadableState.data));
    case 'hasError':
      return Option.of(Result.err(loadableState.error));
    default:
      return Option.ofEmpty();
  }
}

export function createFunctionForAsyncAtomWithMutate<T, U extends unknown[]>(
  fn: (previousValue?: T, ...args: U) => T | Promise<T>,
  ...initialArgs: U
): () => [Option<Result<T, unknown>>, (...args: U) => Promise<void>] {
  const thisAsyncAtomWithMutate = asyncAtomWithMutate(fn, ...initialArgs);
  const thisLoadable = loadable(thisAsyncAtomWithMutate);
  return () => {
    const [loadableState] = useAtom(thisLoadable);
    const setState = useSetAtom(thisAsyncAtomWithMutate);

    return [
      resolveLoadableState(loadableState),
      (...args: U) => setState(args),
    ];
  };
}

export function createHookInitializedFunctionForAsyncAtomWithMutate<
  T,
  U extends unknown[],
>(fn: (previousValue?: T, ...args: U) => T | Promise<T>) {
  let functionForAsyncAtomWithMutate:
    | (() => [Option<Result<T, unknown>>, (...args: U) => Promise<void>])
    | null = null;
  return (...initialArgs: U) => {
    if (functionForAsyncAtomWithMutate === null) {
      functionForAsyncAtomWithMutate = createFunctionForAsyncAtomWithMutate(
        fn,
        ...initialArgs,
      );
    }
    return functionForAsyncAtomWithMutate();
  };
}
