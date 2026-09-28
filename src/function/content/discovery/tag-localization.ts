import type { ContentElement } from '../types/content-element';

export default function packageTagLabel(
  element: ContentElement,
  tag: string,
  language: string,
): string | undefined {
  const languages = [...new Set([language, language.split('-')[0], 'en'])];
  const sources = languages.flatMap((locale) => [
    element.extension?.locales?.[locale]?.[`tags.${tag}`],
    element.contents['tag-locales']?.[locale]?.[tag],
  ]);
  return sources
    .find(
      (label): label is string => typeof label === 'string' && !!label.trim(),
    )
    ?.trim();
}
