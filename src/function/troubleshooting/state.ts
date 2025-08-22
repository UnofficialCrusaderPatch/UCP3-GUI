import { atomWithQuery } from 'jotai-tanstack-query';
import { ResponseType } from '@tauri-apps/api/http';
import { fetch } from '../../tauri/tauri-http';
import { LANGUAGE_ATOM } from '../gui-settings/settings'; // 1. Import LANGUAGE_ATOM

// https://raw.githubusercontent.com/UnofficialCrusaderPatch/UnofficialCrusaderPatch/refs/heads/main/TROUBLESHOOTING.md
// eslint-disable-next-line import/prefer-default-export
export const TROUBLESHOOTING_MD_CONTENT_ATOM = atomWithQuery((get) => {
  const lang = get(LANGUAGE_ATOM); // Get the current language

  return {
    queryKey: ['troubleshooting', lang], // Add lang to queryKey to trigger refetch on change
    queryFn: async () => {
      const baseUrl =
        'https://raw.githubusercontent.com/UnofficialCrusaderPatch/UnofficialCrusaderPatch/refs/heads/main';
      const fallbackUrl = `${baseUrl}/TROUBLESHOOTING.md`;

      // If 'en' is selected, no need to try a localized version first.
      if (lang !== 'en') {
        const localizedUrl = `${baseUrl}/TROUBLESHOOTING/TROUBLESHOOTING-${lang}.md`;
        const request = await fetch<string>(localizedUrl, {
          responseType: ResponseType.Text,
          method: 'GET',
        });

        if (request.ok) {
          return request.data; // 5. If localized version is found, return it.
        }
      }

      // 6. Fetch the fallback if the localized version wasn't found or lang is 'en'
      const fallbackRequest = await fetch<string>(fallbackUrl, {
        responseType: ResponseType.Text,
        method: 'GET',
      });

      if (!fallbackRequest.ok) {
        return 'Failed to fetch Troubleshooting document';
      }

      return fallbackRequest.data;
    },
    staleTime: Infinity,
  };
});
