/* eslint-disable no-param-reassign */
import { atom } from 'jotai';
import { selectAtom } from 'jotai/utils';
// eslint-disable-next-line import/no-extraneous-dependencies
import MiniSearch from 'minisearch';
import {
  DisplayConfigElement,
  OptionEntry,
} from '../../../../../../config/ucp/common';
import {
  applyCategoryBasedSort,
  optionEntriesToHierarchical,
} from '../../../../../../config/ucp/extension-util';
import { applyLocale } from '../../../../../../function/extensions/discovery/translation';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../../../../../function/extensions/state/state';
import { LANGUAGE_ATOM } from '../../../../../../function/gui-settings/settings';
import { ConsoleLogger } from '../../../../../../util/scripts/logging';

export const ACTIVE_EXTENSIONS_ATOM = selectAtom(
  EXTENSION_STATE_REDUCER_ATOM,
  (state) => state.activeExtensions,
);

export const LOCALIZED_UI_OPTION_ENTRIES_ATOM = atom<DisplayConfigElement[]>(
  (get) => {
    const extensions = get(ACTIVE_EXTENSIONS_ATOM);
    const language = get(LANGUAGE_ATOM);

    const euis = extensions.map((e) => {
      const locale = e.locales[language] ?? e.locales.en;
      if (locale === undefined) {
        return e.ui;
      }
      const localized = applyLocale(e, locale);
      return localized;
    });

    const uiCollection: unknown[] = [];
    euis.forEach((eui) => {
      uiCollection.push(...eui);
    });

    return applyCategoryBasedSort(uiCollection).filter(
      (o: DisplayConfigElement) => o.hidden === undefined || o.hidden === false,
    );
  },
);

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
  parent?: DisplayConfigElement,
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
      oe.parent = parent;
    }
    if (oe.display === 'CustomMenu') {
      oe.id = addToCollection({
        url: oe.url,
        text: [oe.text, oe.header, oe.name].join('\n'),
      });
      oe.parent = parent;
    }
    if (oe.display === 'FileInput') {
      oe.id = addToCollection({
        url: oe.url,
        text: [oe.text, oe.tooltip, oe.name].join('\n'),
      });
      oe.parent = parent;
    }
    if (oe.display === 'Group') {
      const url = `${oe.name}.group`;

      oe.id = addToCollection({
        url,
        text: [oe.text, oe.description, oe.name].join('\n'),
      });
      oe.parent = parent;

      collectTextFromOptionEntries(oe.children, collect, oe);
    }
    if (oe.display === 'GroupBox') {
      const url = `${oe.name}.group`;

      oe.id = addToCollection({
        url,
        text: [oe.text, oe.description, oe.name].join('\n'),
      });

      oe.parent = parent;

      collectTextFromOptionEntries(oe.children, collect, oe);
    }
    if (oe.display === 'Number') {
      const { url } = oe;

      oe.id = addToCollection({
        url,
        text: [oe.text, oe.tooltip, oe.name].join('\n'),
      });
      oe.parent = parent;
    }
    if (oe.display === 'Paragraph') {
      const url = `${oe.name}.group`;

      oe.id = addToCollection({
        url,
        text: [oe.text, oe.header, oe.name].join('\n'),
      });
      oe.parent = parent;
    }
    if (oe.display === 'RadioGroup') {
      const { url } = oe;

      oe.id = addToCollection({
        url,
        text: [oe.text, oe.name].join('\n'),
      });
      oe.parent = parent;
    }
    if (oe.display === 'Slider') {
      const { url } = oe;

      oe.id = addToCollection({
        url,
        text: [oe.name].join('\n'),
      });
      oe.parent = parent;
    }
    if (oe.display === 'Switch') {
      const { url } = oe;

      oe.id = addToCollection({
        url,
        text: [oe.name, oe.text, oe.tooltip].join('\n'),
      });
      oe.parent = parent;
    }
    if (oe.display === 'UCP2RadioGroup') {
      const { url } = oe;

      oe.id = addToCollection({
        url,
        text: [oe.name, oe.text, oe.header].join('\n'),
      });
      oe.parent = parent;
    }
    if (oe.display === 'UCP2Slider') {
      const { url } = oe;

      oe.id = addToCollection({
        url,
        text: [oe.name, oe.text, oe.header].join('\n'),
      });
      oe.parent = parent;
    }
    if (oe.display === 'UCP2SliderChoice') {
      const { url } = oe;

      oe.id = addToCollection({
        url,
        text: [oe.name, oe.text, oe.header].join('\n'),
      });
      oe.parent = parent;
    }
    if (oe.display === 'UCP2Switch') {
      const { url } = oe;

      oe.id = addToCollection({
        url,
        text: [oe.name, oe.text, oe.header].join('\n'),
      });
      oe.parent = parent;
    }

    return undefined;
  });

  return collect;
}

export const OPTIONS_TEXT_ATOM = atom((get) => {
  const documents = collectTextFromOptionEntries(
    get(LOCALIZED_UI_OPTION_ENTRIES_ATOM),
  );

  return documents;
});

export const MINISEARCH_ATOM = atom<MiniSearch>((get) => {
  const ms = new MiniSearch({
    fields: ['content', 'url'],
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
  const results = ms.search(query, { fuzzy: 0.1, prefix: true });

  return results;
});

export const FILTERED_OPTIONS = atom((get) => {
  const all = get(LOCALIZED_UI_OPTION_ENTRIES_ATOM);

  const results = get(SEARCH_RESULTS_ATOM);
  if (results) {
    const ids = results.map((sr) => sr.id);

    ConsoleLogger.info(results);

    // The problem is that entire Group or GroupBox can become filtered even though a direct child is relevant...
    return all.filter((oe) => oe.id !== undefined && ids.indexOf(oe.id) !== -1);
  }

  return all;
});

export const LOCALIZED_UI_HIERARCHICAL_ATOM = atom((get) =>
  optionEntriesToHierarchical(
    get(FILTERED_OPTIONS) as unknown as OptionEntry[],
  ),
);
