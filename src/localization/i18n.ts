// Tut Source: https://phrase.com/blog/posts/localizing-react-apps-with-i18next/

import { LANGUAGE_ATOM } from 'function/gui-settings/settings';
import i18next, { Namespace } from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { atom } from 'jotai';
import { initReactI18next } from 'react-i18next';
import Result from 'util/structs/result';
import { parse as yamlParse } from 'yaml';

i18next
  .use(initReactI18next)
  // source: https://www.i18next.com/how-to/add-or-load-translations#lazy-load-in-memory-translations
  .use(
    resourcesToBackend((language, namespace, callback) => {
      import(`./sources/${language}/${namespace}.yaml?raw`)
        .then(({ default: resources }) =>
          Result.try<unknown, unknown, [string]>(yamlParse, resources).consider(
            (ok) => callback(null, ok as object),
            (err) => callback(err as Error, null),
          ),
        )
        .catch((error) => callback(error, null));
    }),
  )
  .init({
    ns: [],
    defaultNS: 'gui-general',
    fallbackNS: 'gui-general',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export const LANGUAGE_STATE_ATOM = atom(async (get) => {
  await i18next.changeLanguage(get(LANGUAGE_ATOM));
});

export function getTranslation(ns: Namespace | null = null) {
  return i18next.getFixedT(null, ns);
}

export default i18next;
