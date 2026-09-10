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
};

export const EMPTY_DISCOVERY_FILTER: DiscoveryFilter = {
  search: '',
  tags: [],
  match: 'any',
};

export function createDiscoverySearch(
  documents: SearchDocument[],
  language: string,
) {
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
          token.phrase
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
        fields.some((field) => field.includes(token.text)),
      );
      if (!tokens.every((_, i) => literal[i] || fuzzy[i].has(doc.id))) return;
      const approximate = literal.some((matched) => !matched);
      let score = 0;
      if (query) {
        score = 20;
        if (doc.name === query || doc.displayName === query) score = 100;
        else if (
          doc.name.startsWith(query) ||
          doc.displayName.startsWith(query)
        )
          score = 80;
        else if (
          tokens.every(
            (token) =>
              doc.name.includes(token.text) ||
              doc.displayName.includes(token.text),
          )
        )
          score = 60;
        if (approximate) score -= 100;
      }
      const original = doc.plainText;
      const descriptionMatch = tokens.find((token) =>
        doc.text.includes(token.text),
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
