import type { ContentElement } from '../types/content-element';

function packageLabel(
  element: ContentElement,
  id: string,
  language: string,
  kind: 'tags' | 'family',
): string | undefined {
  const languages = [...new Set([language, language.split('-')[0], 'en'])];
  const sources = languages.flatMap((locale) => [
    element.extension?.locales?.[locale]?.[`${kind}.${id}`],
    element.contents[kind === 'tags' ? 'tag-locales' : 'family-locales']?.[
      locale
    ]?.[id],
  ]);
  return sources
    .find(
      (label): label is string => typeof label === 'string' && !!label.trim(),
    )
    ?.trim();
}

export default function packageTagLabel(
  element: ContentElement,
  tag: string,
  language: string,
) {
  return packageLabel(element, tag, language, 'tags');
}

export function packageFamilyLabel(
  element: ContentElement,
  family: string,
  language: string,
) {
  return packageLabel(element, family, language, 'family');
}
