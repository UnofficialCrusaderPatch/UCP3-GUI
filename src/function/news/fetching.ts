import { ResponseType } from '@tauri-apps/api/http';
import { fetch } from '../../tauri/tauri-http';
import { parseNews } from './parsing';

// eslint-disable-next-line import/prefer-default-export
export async function fetchNews({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  queryKey: [, ucpVersion],
}: {
  queryKey: [string, string];
}) {
  const request = await fetch(
    'https://raw.githubusercontent.com/UnofficialCrusaderPatch/UnofficialCrusaderPatch/refs/heads/main/NEWS.md',
    { responseType: ResponseType.Text, method: 'GET' },
  );
  const news = parseNews(request.data!.toString().trim());

  return news;
}
