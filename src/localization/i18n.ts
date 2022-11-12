// Tut Source: https://phrase.com/blog/posts/localizing-react-apps-with-i18next/

import i18next from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { initReactI18next } from 'react-i18next';

i18next
  .use(initReactI18next)
  // source: https://www.i18next.com/how-to/add-or-load-translations#lazy-load-in-memory-translations
  .use(
    resourcesToBackend((language, namespace, callback) => {
      import(`./sources/${language}/${namespace}.json`)
        .then(({ default: resources }) => callback(null, resources))
        .catch((error) => callback(error, null));
    })
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

export default i18next;
