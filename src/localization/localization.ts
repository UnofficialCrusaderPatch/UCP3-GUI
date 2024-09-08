import { atom } from 'jotai';
import { Atom } from 'jotai/vanilla';
import { ReactNode } from 'react';
import {
  AVAILABLE_LANGUAGES_FILENAME,
  LOCALIZATION_DIRECTORY,
  LOCALIZATION_SOURCES_DIRECTORY,
} from '../function/global/constants/file-constants';
import { loadYaml, resolveResourcePath } from '../tauri/tauri-files';
import { LANGUAGE_ATOM } from '../function/gui-settings/settings';
import Logger from '../util/scripts/logging';

// types

export interface MessageObject {
  key: string;
  args?: Record<string, unknown>;
}

export type MessageFunction = (localize: MessageResolver) => ReactNode;

export type SimpleMessage = string | MessageObject;
export type Message = SimpleMessage | MessageFunction;

export type MessageResolver = <T extends Message>(
  message: T,
) => T extends MessageFunction ? ReactNode : string;

export type MessageResolverAtom = Atom<Promise<MessageResolver>>;

// non atom constants

const LOGGER = new Logger('localization.ts');

const DEFAULT_LANG = 'en';

// functions

async function loadLanguageResource(
  path: string[],
): Promise<Record<string, string>> {
  return resolveResourcePath([LOCALIZATION_DIRECTORY, ...path])
    .then(loadYaml)
    .then((res) => res.getOrThrow())
    .catch((err) => {
      LOGGER.msg('Failed to load languages file: {}', err).error();
      return {};
    });
}

async function loadAvailableLanguages() {
  return loadLanguageResource([AVAILABLE_LANGUAGES_FILENAME]);
}

async function loadLocalization(language: string) {
  return loadLanguageResource([
    LOCALIZATION_SOURCES_DIRECTORY,
    `${language}.yaml`,
  ]);
}

function resolveLocalizationTextWithFallback(
  key: string,
  currentLanguage: string,
  currentLocalization: Record<string, string>,
  defaultLanguage: string,
  defaultLocalization: Record<string, string> | null,
) {
  const fallbackLocalization = defaultLocalization ?? currentLocalization;
  if (defaultLocalization) {
    const result = currentLocalization[key];
    if (result) {
      return result;
    }
    LOGGER.msg(
      "Missing localization key for lang '{}': {}",
      currentLanguage,
      key,
    ).warn();
  }

  const result = fallbackLocalization[key];
  if (result) {
    return result;
  }
  LOGGER.msg(
    "Missing localization key for default lang '{}': {}",
    defaultLanguage,
    key,
  ).error();

  return key;
}

function resolveParameterText(text: string, args: Record<string, unknown>) {
  return text.replaceAll(/{{(.*?)}}/g, (match, id) => {
    if (!(id in args)) {
      return match;
    }

    const value = args[id];
    if (typeof value === 'string') {
      return value;
    }
    return String(value);
  });
}

export function createMessageResolver(
  currentLanguage: string,
  currentLocalization: Record<string, string>,
  defaultLanguage: string,
  defaultLocalization: Record<string, string> | null,
) {
  const usedDefaultLocalization =
    currentLanguage === defaultLanguage ? null : defaultLocalization;

  // NOTE: breaking type system, found no way with it
  const resolverFunction: unknown = (message: Message) => {
    if (typeof message === 'function') {
      return message(resolverFunction as MessageResolver);
    }

    const isSimpleKey = typeof message === 'string';

    const key = isSimpleKey ? message : message.key;
    const text = resolveLocalizationTextWithFallback(
      key,
      currentLanguage,
      currentLocalization,
      defaultLanguage,
      usedDefaultLocalization,
    );

    if (isSimpleKey || !message.args || text === key) {
      return text;
    }

    return resolveParameterText(text, message.args);
  };
  return resolverFunction as MessageResolver;
}

// atoms

const DEFAULT_LOCALIZATION_ATOM = atom(loadLocalization(DEFAULT_LANG));

const CURRENT_LOCALIZATION_ATOM = atom((get) => {
  const currentLang = get(LANGUAGE_ATOM);
  return currentLang === DEFAULT_LANG
    ? get(DEFAULT_LOCALIZATION_ATOM)
    : loadLocalization(currentLang);
});

// currently no reset without GUI reload
export const AVAILABLE_LANGUAGES_ATOM = atom(loadAvailableLanguages);

export const GUI_LOCALIZATION_ATOM: MessageResolverAtom = atom(async (get) =>
  createMessageResolver(
    get(LANGUAGE_ATOM),
    await get(CURRENT_LOCALIZATION_ATOM),
    DEFAULT_LANG,
    await get(DEFAULT_LOCALIZATION_ATOM),
  ),
);
