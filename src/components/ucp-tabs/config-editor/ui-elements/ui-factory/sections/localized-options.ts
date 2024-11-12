import { atom } from 'jotai';
import { selectAtom } from 'jotai/utils';
import { DisplayConfigElement } from '../../../../../../config/ucp/common';
import { applyCategoryBasedSort } from '../../../../../../config/ucp/extension-util';
import { applyLocale } from '../../../../../../function/extensions/discovery/translation';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../../../../../function/extensions/state/state';
import { LANGUAGE_ATOM } from '../../../../../../function/gui-settings/settings';

const ACTIVE_EXTENSIONS_ATOM = selectAtom(
  EXTENSION_STATE_REDUCER_ATOM,
  (state) => state.activeExtensions,
);

// eslint-disable-next-line import/prefer-default-export
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
