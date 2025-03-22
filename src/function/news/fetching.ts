import { ResponseType } from '@tauri-apps/api/http';
import { fetch } from '../../tauri/tauri-http';
import { parseNews } from './parsing';
import Logger from '../../util/scripts/logging';
import { News } from './types';

const LOGGER = new Logger('news/fetching.ts');

// eslint-disable-next-line import/prefer-default-export
export async function fetchNews({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  queryKey: [, ucpVersion],
}: {
  queryKey: [string, string];
}): Promise<News> {
  const request = await fetch(
    'https://raw.githubusercontent.com/UnofficialCrusaderPatch/UnofficialCrusaderPatch/refs/heads/main/NEWS.md',
    { responseType: ResponseType.Text, method: 'GET' },
  );
  if (request.data === undefined || request.data === null) {
    return [];
  }
  const raw = request.data.toString().trim();
  const news = parseNews(raw);

  LOGGER.msg(`News: ${JSON.stringify(news)}`).debug();
  LOGGER.msg(`Raw news: ${JSON.stringify(raw)}`).debug();

  return news;
}
