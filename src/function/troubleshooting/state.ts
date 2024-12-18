import { atomWithQuery } from 'jotai-tanstack-query';
import { ResponseType } from '@tauri-apps/api/http';
import { fetch } from '../../tauri/tauri-http';

// https://raw.githubusercontent.com/UnofficialCrusaderPatch/UnofficialCrusaderPatch/refs/heads/main/TROUBLESHOOTING.md
// eslint-disable-next-line import/prefer-default-export
export const TROUBLESHOOTING_MD_CONTENT_ATOM = atomWithQuery(() => ({
  queryKey: ['troubleshooting'],
  queryFn: async () => {
    const request = await fetch<string>(
      'https://raw.githubusercontent.com/UnofficialCrusaderPatch/UnofficialCrusaderPatch/refs/heads/main/TROUBLESHOOTING.md',
      {
        responseType: ResponseType.Text,
        method: 'GET',
      },
    );

    if (!request.ok) {
      return 'Failed to fetch Troubleshooting document';
    }

    return request.data;
  },
  staleTime: Infinity,
}));
