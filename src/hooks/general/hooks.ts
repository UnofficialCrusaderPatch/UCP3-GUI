import { createSearchParams, useSearchParams } from 'react-router-dom';

// returns normal search params, but setSearchParams expects object and boolean

// eslint-disable-next-line import/prefer-default-export
export function useSearchParamsCustom(): [
  URLSearchParams,
  (
    newParams: { [keys: string]: string | string[] },
    keepNonOverwritten?: boolean,
  ) => void,
] {
  const [searchParams, setSearchParams] = useSearchParams();
  return [
    searchParams,
    (newParams, keepNonOverwritten = true) => {
      setSearchParams(
        createSearchParams(
          keepNonOverwritten ? { ...searchParams, ...newParams } : newParams,
        ),
      );
    },
  ];
}
