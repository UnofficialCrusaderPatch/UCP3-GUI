import { atomWithQuery } from 'jotai-tanstack-query';
import { ResponseType, Response } from '@tauri-apps/api/http';
import { fetch } from '../../tauri/tauri-http';
import { LANGUAGE_ATOM } from '../gui-settings/settings';

// https://raw.githubusercontent.com/UnofficialCrusaderPatch/UnofficialCrusaderPatch/refs/heads/main/TROUBLESHOOTING.md
// eslint-disable-next-line import/prefer-default-export
export const TROUBLESHOOTING_MD_CONTENT_ATOM = atomWithQuery((get) => ({
  queryKey: ['troubleshooting', get(LANGUAGE_ATOM)],
  queryFn: async () => {
    const lang = get(LANGUAGE_ATOM);
    const urls = [
      `https://raw.githubusercontent.com/UnofficialCrusaderPatch/UnofficialCrusaderPatch/refs/heads/main/locale/TROUBLESHOOTING-${lang}.md`,
      `https://raw.githubusercontent.com/UnofficialCrusaderPatch/UnofficialCrusaderPatch/refs/heads/main/TROUBLESHOOTING/TROUBLESHOOTING-${lang}.md`,
      `https://raw.githubusercontent.com/UnofficialCrusaderPatch/UnofficialCrusaderPatch/refs/heads/main/TROUBLESHOOTING.md`,
    ];

    const requests: { [url: string]: Response<string> } = {};

    // eslint-disable-next-line no-plusplus
    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      // eslint-disable-next-line no-await-in-loop
      const request = await fetch<string>(url, {
        responseType: ResponseType.Text,
        method: 'GET',
      });

      requests[url] = request;

      if (request.ok) {
        return request.data;
      }
    }

    throw Error(
      `Failed to retrieve Troubleshooting. Reasons: ${Object.entries(requests).map(([url, req]) => `${url}: ${req.status}`)}`,
    );
  },
  staleTime: Infinity,
}));
