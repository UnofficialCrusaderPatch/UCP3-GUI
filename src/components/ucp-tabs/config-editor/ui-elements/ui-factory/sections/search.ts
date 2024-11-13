/* eslint-disable no-param-reassign */
import { atom } from 'jotai';
import MiniSearch from 'minisearch';
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

function collectTextFromOptionEntries(
  optionEntries: DisplayConfigElement[],
  collection?: TextObject[],
) {
  const collect = collection ?? [];

  const addToCollection = (obj: URLTextObject) => {
    const id = collect.length + 1;
    // eslint-disable-next-line no-param-reassign
    collect.push({ ...obj, id });

    return id;
  };
  optionEntries.forEach((oe) => {
    if (oe.display === 'Choice') {
      oe.id = addToCollection({
        url: oe.url,
        text: [oe.text, oe.tooltip, oe.name].join('\n'),
      });
    }
    if (oe.display === 'CustomMenu') {
      oe.id = addToCollection({
        url: oe.url,
        text: [oe.text, oe.header, oe.name].join('\n'),
      });
    }
    if (oe.display === 'FileInput') {
      oe.id = addToCollection({
        url: oe.url,
        text: [oe.text, oe.tooltip, oe.name].join('\n'),
      });
    }
    if (oe.display === 'Group') {
      const url = `${oe.name}.group`;

      oe.id = addToCollection({
        url,
        text: [oe.text, oe.description, oe.name].join('\n'),
      });

      collectTextFromOptionEntries(oe.children, collect);
    }
    if (oe.display === 'GroupBox') {
      const url = `${oe.name}.group`;

      oe.id = addToCollection({
        url,
        text: [oe.text, oe.description, oe.name].join('\n'),
      });

      collectTextFromOptionEntries(oe.children, collect);
    }
    if (oe.display === 'Number') {
      const { url } = oe;

      oe.id = addToCollection({
        url,
        text: [oe.text, oe.tooltip, oe.name].join('\n'),
      });
    }
    if (oe.display === 'Paragraph') {
      const url = `${oe.name}.group`;

      oe.id = addToCollection({
        url,
        text: [oe.text, oe.header, oe.name].join('\n'),
      });
    }
    if (oe.display === 'RadioGroup') {
      const { url } = oe;

      oe.id = addToCollection({
        url,
        text: [oe.text, oe.name].join('\n'),
      });
    }
    if (oe.display === 'Slider') {
      const { url } = oe;

      oe.id = addToCollection({
        url,
        text: [oe.name].join('\n'),
      });
    }
    if (oe.display === 'Switch') {
      const { url } = oe;

      oe.id = addToCollection({
        url,
        text: [oe.name, oe.text, oe.tooltip].join('\n'),
      });
    }
    if (oe.display === 'UCP2RadioGroup') {
      const { url } = oe;

      oe.id = addToCollection({
        url,
        text: [oe.name, oe.text, oe.header].join('\n'),
      });
    }
    if (oe.display === 'UCP2Slider') {
      const { url } = oe;

      oe.id = addToCollection({
        url,
        text: [oe.name, oe.text, oe.header].join('\n'),
      });
    }
    if (oe.display === 'UCP2SliderChoice') {
      const { url } = oe;

      oe.id = addToCollection({
        url,
        text: [oe.name, oe.text, oe.header].join('\n'),
      });
    }
    if (oe.display === 'UCP2Switch') {
      const { url } = oe;

      oe.id = addToCollection({
        url,
        text: [oe.name, oe.text, oe.header].join('\n'),
      });
    }

    return undefined;
  });

  return collect;
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
    combineWith: 'AND',
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
  const results = ms.search(query, { fuzzy: 0.1, prefix: true });

  return results;
});
