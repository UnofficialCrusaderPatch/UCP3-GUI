import { ContentElement } from '../types/content-element';
import { DescriptionContent, fetchDescription } from '../store/fetch';
import { createExtensionID } from '../../global/constants/extension-id';

export type ResolvedDescription = {
  text: string;
  language?: string;
  incomplete: boolean;
};

export function orderedDescriptions(
  sources: DescriptionContent[],
  language: string,
): DescriptionContent[] {
  const order = [
    ...new Set([language, language.split('-')[0], 'default', 'en']),
  ];
  return order.flatMap((lang) =>
    sources.filter((source) => source.language === lang),
  );
}

export function inlineDescription(
  element: ContentElement | undefined,
  language: string,
): string {
  const source = orderedDescriptions(
    element?.contents.description ?? [],
    language,
  ).find((item) => item.method === 'inline' && item.content.trim());
  return source?.method === 'inline' ? source.content : '';
}

// Bound background catalog I/O; the existing QueryClient owns result caching.
let pendingReads = 0;
const waiting: Array<() => void> = [];
async function limitedRead<T>(read: () => Promise<T>): Promise<T> {
  if (pendingReads >= 4)
    await new Promise<void>((resolve) => {
      waiting.push(resolve);
    });
  else pendingReads += 1;
  try {
    return await read();
  } finally {
    const next = waiting.shift();
    if (next) next();
    else pendingReads -= 1;
  }
}

export async function resolveContentDescription(
  element: ContentElement,
  language: string,
): Promise<ResolvedDescription> {
  let incomplete = false;
  if (element.extension) {
    try {
      const text = await limitedRead(() =>
        element.extension!.io.fetchDescription(language),
      );
      if (text.trim()) return { text, incomplete: false };
    } catch {
      incomplete = true;
    }
  }
  const sources = orderedDescriptions(element.contents.description, language);
  const readSource = async (index: number): Promise<ResolvedDescription> => {
    const source = sources[index];
    if (!source) return { text: '', language, incomplete };
    try {
      const text =
        source.method === 'inline'
          ? source.content
          : await limitedRead(() => fetchDescription(source.url));
      if (text.trim()) return { text, language: source.language, incomplete };
    } catch {
      incomplete = true;
    }
    return readSource(index + 1);
  };
  return readSource(0);
}

export function descriptionQuery(
  element: ContentElement | undefined,
  language: string,
) {
  return {
    queryKey: [
      'extension-description',
      element ? createExtensionID(element) : '',
      language,
      element?.contents.description,
      element?.extension?.io.path,
      element?.extension?.io.descriptionRevision,
    ],
    queryFn: () =>
      element
        ? resolveContentDescription(element, language)
        : Promise.resolve({ text: '', language, incomplete: false }),
    enabled: element !== undefined,
    retry: false as const,
    staleTime: Infinity,
  };
}
