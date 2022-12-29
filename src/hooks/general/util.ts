import { createSearchParams, useSearchParams } from 'react-router-dom';
import { useEffect, useLayoutEffect, useRef } from 'react';

// returns normal search params, but setSearchParams expects object and boolean

// eslint-disable-next-line import/prefer-default-export
export function useSearchParamsCustom(): [
  URLSearchParams,
  (
    newParams: { [keys: string]: string | string[] },
    keepNonOverwritten?: boolean
  ) => void
] {
  const [searchParams, setSearchParams] = useSearchParams();
  return [
    searchParams,
    (newParams, keepNonOverwritten = true) => {
      setSearchParams(
        createSearchParams(
          keepNonOverwritten ? { ...searchParams, ...newParams } : newParams
        )
      );
    },
  ];
}

// source: https://usehooks-ts.com/react-hook/use-timeout
export function useTimeout(callback: () => void, delay: number | null) {
  const savedCallback = useRef(callback);

  // Remember the latest callback if it changes.
  useLayoutEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the timeout.
  useEffect(() => {
    // Don't schedule if no delay is specified.
    // Note: 0 is a valid value for delay.
    if (!delay && delay !== 0) {
      return;
    }
    const id = setTimeout(() => savedCallback.current(), delay);
    // eslint-disable-next-line consistent-return
    return () => clearTimeout(id);
  }, [delay]);
}
