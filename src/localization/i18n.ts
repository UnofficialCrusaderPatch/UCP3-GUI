// Tut Source: https://phrase.com/blog/posts/localizing-react-apps-with-i18next/

import i18next, { Namespace } from 'i18next';
import resourcesToBackend from 'i18next-resources-to-backend';
import { atom } from 'jotai';
import { initReactI18next } from 'react-i18next';
import { Atom } from 'jotai/vanilla';
import { LANGUAGE_ATOM } from '../function/gui-settings/settings';
import Logger from '../util/scripts/logging';
import { loadYaml, resolveResourcePath } from '../tauri/tauri-files';
import {
  AVAILABLE_LANGUAGES_FILENAME,
  LOCALIZATION_DIRECTORY,
  LOCALIZATION_SOURCES_DIRECTORY,
} from '../function/global/constants/file-constants';

const LOGGER = new Logger('i18n.ts');

i18next
  .use(initReactI18next)
  // source: https://www.i18next.com/how-to/add-or-load-translations#lazy-load-in-memory-translations
  .use(
    resourcesToBackend((language, namespace, callback) =>
      resolveResourcePath([
        LOCALIZATION_DIRECTORY,
        LOCALIZATION_SOURCES_DIRECTORY,
        `${language}/${namespace}.yaml`,
      ])
        .then(loadYaml)
        .then((res) => callback(null, res.getOrThrow()))
        .catch((error) => callback(error, null)),
    ),
  )
  .init({
    ns: [],
    defaultNS: 'gui-general',
    fallbackNS: 'gui-general',
    fallbackLng: 'en',
  });

// currently no reset without GUI reload
export const AVAILABLE_LANGUAGES_ATOM: Atom<Promise<Record<string, string>>> =
  atom(() =>
    resolveResourcePath([LOCALIZATION_DIRECTORY, AVAILABLE_LANGUAGES_FILENAME])
      .then(loadYaml)
      .then((res) => res.getOrThrow())
      .catch((err) => {
        LOGGER.msg('Failed to load languages file: {}', err).error();
        return {};
      }),
  );

export const LANGUAGE_STATE_ATOM = atom(async (get) => {
  await i18next.changeLanguage(get(LANGUAGE_ATOM));
});

export function getTranslation(ns: Namespace | null = null) {
  return i18next.getFixedT(null, ns);
}

export default i18next;
