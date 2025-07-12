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
      if (e.locales === undefined) return e.ui;

      const fallbackLocale = e.locales.en;
      const locale = e.locales[language] ?? fallbackLocale;
      if (locale === undefined) {
        return e.ui;
      }

      const fallbackKeys = Object.keys(fallbackLocale);
      const keys = Object.keys(locale);

      const missingKeys = fallbackKeys.filter((k) => keys.indexOf(k) === -1);
      missingKeys.forEach((k) => {
        locale[k] = fallbackLocale[k];
      });

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
