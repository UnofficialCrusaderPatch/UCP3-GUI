/* eslint-disable no-param-reassign */
import { atom } from 'jotai';
import MiniSearch from 'minisearch';
import { displayChildren } from '../../../../../../config/ucp/display-tree';
import { DisplayConfigElement } from '../../../../../../config/ucp/common';
import { ConsoleLogger } from '../../../../../../util/scripts/logging';
import { LOCALIZED_UI_OPTION_ENTRIES_ATOM } from './localized-options';

type URLTextObject = {
  url: string;
  text: string;
};
type TextObject = URLTextObject & {
  id: number;
};

export function collectTextFromOptionEntries(
  optionEntries: DisplayConfigElement[],
  collection: TextObject[] = [],
) {
  optionEntries
    .filter((oe) => !oe.hidden)
    .forEach((oe) => {
      const fields = oe as unknown as Record<string, unknown>;
      const text = ['text', 'tooltip', 'header', 'description', 'name']
        .map((key) => fields[key])
        .filter((value) => typeof value === 'string')
        .join('\n');
      oe.id = collection.length + 1;
      collection.push({ id: oe.id, url: 'url' in oe ? oe.url : oe.name, text });
      collectTextFromOptionEntries(displayChildren(oe), collection);
    });
  return collection;
}

export function searchOptions(ms: MiniSearch, query: string) {
  return ms.search(query, {
    prefix: (term) => term.length >= 3,
    fuzzy: (term) => (term.length >= 5 ? 0.1 : false),
  });
}

// eslint-disable-next-line import/prefer-default-export
export const OPTIONS_TEXT_ATOM = atom((get) => {
  const documents = collectTextFromOptionEntries(
    get(LOCALIZED_UI_OPTION_ENTRIES_ATOM),
  );

  ConsoleLogger.debug('text content', documents);

  return documents;
});

export const MINISEARCH_ATOM = atom<MiniSearch>((get) => {
  const ms = new MiniSearch({
    fields: ['text', 'url'],
    storeFields: ['url'],
  });

  ms.addAll(get(OPTIONS_TEXT_ATOM));

  return ms;
});

export const SEARCH_QUERY_ATOM = atom<string>('');

export const SEARCH_RESULTS_ATOM = atom((get) => {
  const query = get(SEARCH_QUERY_ATOM);
  if (query === undefined || query.length === 0) {
    return undefined;
  }

  const ms = get(MINISEARCH_ATOM);
  const results = searchOptions(ms, query);

  return results;
});
