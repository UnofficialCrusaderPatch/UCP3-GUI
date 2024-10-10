import { atomWithQuery } from 'jotai-tanstack-query';
import { atom } from 'jotai';
import { UCP_VERSION_ATOM } from '../ucp-files/ucp-version';
import { fetchNews } from './fetching';
import { News, NewsElement } from './types';

// eslint-disable-next-line import/prefer-default-export
export const NEWS_ATOM = atomWithQuery((get) => ({
  queryKey: [
    'news',
    get(UCP_VERSION_ATOM).version.getMajorMinorPatchAsString(),
  ] as [string, string],
  queryFn: fetchNews,
  retry: false,
  // staleTime: Infinity,
}));

export const NEWS_HIGHLIGHT_ATOM = atom((get) => {
  const { data, isError, isLoading, isPending, error } = get(NEWS_ATOM);

  const highlights: News = [];

  if (isLoading || isPending)
    return [
      {
        meta: { category: 'community', timestamp: new Date() },
        content: 'Fetching News...',
      },
    ];

  if (isError)
    return [
      {
        meta: {
          category: 'frontend',
          timestamp: new Date(),
        },
        content: `Could not load news: ${error.toString()}`,
      },
    ];

  const newsItemPerCategory: { [category: string]: NewsElement } = {};

  data.forEach((n) => {
    const cat = n.meta.category;
    if (newsItemPerCategory[cat] === undefined) {
      newsItemPerCategory[cat] = n;
      highlights.push(n as NewsElement);
    }
  });

  return highlights as News;
});

export const SCROLL_TO_NEWS_ATOM = atom<string>('');

export function newsID(news: NewsElement) {
  return `${news.meta.category}-${news.meta.timestamp.toISOString()}`;
}
