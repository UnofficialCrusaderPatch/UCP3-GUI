import { Extension } from '../../../config/ucp/common';
import { changeLocale } from '../locale/locale';

export type Translation = { [key: string]: string };
export type TranslationDB = { [language: string]: Translation };
export function applyLocale(ext: Extension, locale: { [key: string]: string }) {
  const { ui } = ext;
  return ui.map((uiElement: { [key: string]: unknown }) =>
    changeLocale(locale, uiElement as { [key: string]: unknown }),
  );
}
