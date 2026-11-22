import { useContext, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { MINISEARCH_ATOM, SEARCH_QUERY_ATOM, searchOptions } from './search';
import { ModalQueryContext } from './modal-filter';

export function useInitialModalQuery() {
  const parent = useContext(ModalQueryContext);
  const global = useAtomValue(SEARCH_QUERY_ATOM);
  return parent ?? global;
}

export function useModalMatches(query: string) {
  const search = useAtomValue(MINISEARCH_ATOM);
  return useMemo(
    () =>
      query.trim()
        ? new Set(
            searchOptions(search, query).map((result) => result.id as number),
          )
        : undefined,
    [query, search],
  );
}
