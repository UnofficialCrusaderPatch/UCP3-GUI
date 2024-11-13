import './SearchBox.css';

import { atom, useAtomValue, useSetAtom } from 'jotai';
import { ReactSearchAutocomplete } from 'react-search-autocomplete';
import { useMessage } from '../../../../../general/message';
import { MINISEARCH_ATOM, SEARCH_QUERY_ATOM } from './search';

const suggestionsAtom = atom((get) => {
  const ms = get(MINISEARCH_ATOM);
  return ms
    .autoSuggest(get(SEARCH_QUERY_ATOM), {
      fuzzy: 0.2,
    })
    .map((v, index) => ({
      id: index,
      name: v.suggestion,
    }));
});

// eslint-disable-next-line import/prefer-default-export
export function SearchBox() {
  const localize = useMessage();
  const searchWord = localize('config.search');

  // const [searchQuery, setSearchQuery] = useAtom(SEARCH_QUERY_ATOM);

  const setSearchQuery = useSetAtom(SEARCH_QUERY_ATOM);

  const suggestions = useAtomValue(suggestionsAtom);

  return (
    <div className="ucp-customisations-searchbox d-flex justify-content-start w-100 py-1">
      <ReactSearchAutocomplete
        className="flex-grow-1"
        items={suggestions}
        onSearch={(s) => setSearchQuery(s)}
        onSelect={(s) => setSearchQuery(s.name)}
        showItemsOnFocus
        placeholder={searchWord}
      />
      {/* <input
        className="flex-grow-1"
        type="search"
        placeholder={searchWord}
        defaultValue={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
      /> */}
    </div>
  );
}
