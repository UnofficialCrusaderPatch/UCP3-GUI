import MiniSearch from 'minisearch';
import { unified } from 'unified';
import remarkParse from 'remark-parse';

type TextNode = { type: string; value?: string; children?: TextNode[] };
const markdown = unified().use(remarkParse);

export function descriptionText(source: string): string {
  const collect = (node: TextNode): string => {
    if (
      node.type === 'html' ||
      node.type === 'image' ||
      node.type === 'definition'
    )
      return '';
    if (node.value !== undefined) return node.value;
    return (node.children ?? []).map(collect).join(' ');
  };
  return collect(markdown.parse(source)).replace(/\s+/gu, ' ').trim();
}

export function normalizeSearch(value: string, language = 'en'): string {
  const locale = language === 'ch' ? 'zh' : language;
  let folded: string;
  try {
    folded = value.normalize('NFKD').toLocaleLowerCase(locale);
  } catch {
    folded = value.normalize('NFKD').toLowerCase();
  }
  return folded
    .replace(/ı/gu, 'i')
    .replace(/ß/gu, 'ss')
    .replace(/\p{M}/gu, '')
    .replace(/[\u200c\u200d]/gu, '')
    .replace(/ي/gu, 'ی')
    .replace(/ك/gu, 'ک')
    .replace(/\s+/gu, ' ')
    .trim();
}

export type SearchDocument = {
  id: string;
  name: string;
  displayName: string;
  description: string;
  tags: string[];
  tagText: string;
};

export type DiscoveryFilter = {
  search: string;
  tags: string[];
  match: 'any' | 'all';
  wholeWords?: boolean;
};

export const EMPTY_DISCOVERY_FILTER: DiscoveryFilter = {
  search: '',
  tags: [],
  match: 'any',
  wholeWords: false,
};

/** Unicode boundaries avoid matching e.g. German "KI" inside "attacking". */
function containsTerm(field: string, term: string, wholeWords = false) {
  if (!wholeWords) return field.includes(term);
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(
    `(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`,
    'u',
  ).test(field);
}

type WordSegmenter = {
  segment: (text: string) => Iterable<{ index: number; segment: string }>;
};

export function createDiscoverySearch(
  documents: SearchDocument[],
  language: string,
) {
  // CJK text has no spaces between words. Use the browser's word segmentation
  // where available, with the Unicode-boundary rule as the older-engine fallback.
  const { Segmenter } = Intl as typeof Intl & {
    Segmenter?: new (
      locale: string,
      options: { granularity: 'word' },
    ) => WordSegmenter;
  };
  const segmenter =
    language === 'ch' && Segmenter
      ? new Segmenter('zh', { granularity: 'word' })
      : undefined;
  const boundaries = new Map<string, Set<number>>();
  const matches = (
    field: string,
    term: string,
    wholeWords = false,
  ): boolean => {
    if (!wholeWords || !segmenter) return containsTerm(field, term, wholeWords);
    if (!boundaries.has(field)) {
      const edges = new Set([0, field.length]);
      Array.from(segmenter.segment(field)).forEach((part) => {
        edges.add(part.index);
        edges.add(part.index + part.segment.length);
      });
      boundaries.set(field, edges);
    }
    const edges = boundaries.get(field)!;
    let start = field.indexOf(term);
    while (start >= 0) {
      if (edges.has(start) && edges.has(start + term.length)) return true;
      start = field.indexOf(term, start + 1);
    }
    return false;
  };
  const normalized = documents.map((doc) => {
    const plainText = descriptionText(doc.description);
    return {
      ...doc,
      plainText,
      name: normalizeSearch(doc.name, language),
      displayName: normalizeSearch(doc.displayName, language),
      text: normalizeSearch(plainText, language),
      tagText: normalizeSearch(doc.tagText, language),
    };
  });
  const index = new MiniSearch({
    fields: ['name', 'displayName', 'text', 'tagText'],
  });
  index.addAll(normalized);

  return (
    filter: DiscoveryFilter,
  ): Map<string, { score: number; excerpt: string; approximate: boolean }> => {
    const query = normalizeSearch(filter.search, language);
    const tokens = [...query.matchAll(/"([^"]+)"|(\S+)/gu)].map((match) => ({
      text: match[1] ?? match[2],
      phrase: match[1] !== undefined,
    }));
    const fuzzy = tokens.map(
      (token) =>
        new Set(
          token.phrase || filter.wholeWords
            ? []
            : index
                .search(token.text, {
                  prefix: token.text.length >= 3,
                  fuzzy: token.text.length >= 5 ? 0.2 : false,
                })
                .map((hit) => String(hit.id)),
        ),
    );
    const results = new Map<
      string,
      { score: number; excerpt: string; approximate: boolean }
    >();
    normalized.forEach((doc) => {
      const tagMatches = filter.tags.map((tag) => doc.tags.includes(tag));
      if (
        tagMatches.length &&
        !(filter.match === 'all'
          ? tagMatches.every(Boolean)
          : tagMatches.some(Boolean))
      )
        return;
      const fields = [doc.name, doc.displayName, doc.text, doc.tagText];
      const literal = tokens.map((token) =>
        fields.some((field) => matches(field, token.text, filter.wholeWords)),
      );
      if (!tokens.every((_, i) => literal[i] || fuzzy[i].has(doc.id))) return;
      const approximate = literal.some((matched) => !matched);
      let score = 0;
      if (query) {
        score = 20;
        if (doc.name === query || doc.displayName === query) score = 100;
        else if (
          tokens.every((token) => matches(doc.tagText, token.text, true))
        )
          score = 70;
        else if (
          doc.name.startsWith(query) ||
          doc.displayName.startsWith(query)
        )
          score = 80;
        else if (
          tokens.every(
            (token) =>
              matches(doc.name, token.text, filter.wholeWords) ||
              matches(doc.displayName, token.text, filter.wholeWords),
          )
        )
          score = 60;
        if (approximate) score -= 100;
      }
      const original = doc.plainText;
      const descriptionMatch = tokens.find((token) =>
        matches(doc.text, token.text, filter.wholeWords),
      );
      const start = descriptionMatch
        ? Math.max(0, doc.text.indexOf(descriptionMatch.text) - 35)
        : 0;
      const excerpt =
        query && score <= 20 && original
          ? `${start ? '…' : ''}${original.slice(start, start + 150)}${original.length > start + 150 ? '…' : ''}`
          : '';
      results.set(doc.id, { score, excerpt, approximate });
    });
    return results;
  };
}
