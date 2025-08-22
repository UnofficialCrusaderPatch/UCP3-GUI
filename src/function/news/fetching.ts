import { ResponseType } from '@tauri-apps/api/http';
import { fetch } from '../../tauri/tauri-http';
import { parseNews } from './parsing';
import Logger from '../../util/scripts/logging';
import { News } from './types';

const LOGGER = new Logger('news/fetching.ts');

async function fetchAndParse(url: string): Promise<News | null> {
  const request = await fetch<string>(url, {
    responseType: ResponseType.Text,
    method: 'GET',
  });

  if (!request.ok || request.data === undefined || request.data === null) {
    return null;
  }

  const raw = request.data.toString().trim();
  const news = parseNews(raw);

  LOGGER.msg(`News from ${url}: ${JSON.stringify(news)}`).debug();
  return news;
}

// eslint-disable-next-line import/prefer-default-export
export async function fetchNews({
  queryKey: [, lang], // 1. Destructure 'lang' from the queryKey
}: {
  queryKey: [string, string, string]; // 2. Update the type signature
}): Promise<News> {
  const baseUrl =
    'https://raw.githubusercontent.com/UnofficialCrusaderPatch/UnofficialCrusaderPatch/refs/heads/main';
  const fallbackUrl = `${baseUrl}/NEWS.md`;

  // If 'en' is selected, go straight to fallback.
  if (lang !== 'en') {
    const localizedUrl = `${baseUrl}/NEWS/NEWS-${lang}.md`;
    const localizedNews = await fetchAndParse(localizedUrl);
    if (localizedNews) {
      return localizedNews; // 3. Return localized news if found
    }
  }

  // 4. Fetch fallback if localized failed or lang is 'en'
  const fallbackNews = await fetchAndParse(fallbackUrl);
  return fallbackNews ?? []; // Return news or an empty array on failure
}
