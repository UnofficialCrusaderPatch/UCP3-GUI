import { describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { Provider, createStore } from 'jotai';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode } from 'react';
import { useDiscovery } from './use-discovery';
import { LANGUAGE_ATOM } from '../../../../function/gui-settings/settings';
import { ContentElement } from '../../../../function/content/types/content-element';
import { EMPTY_DISCOVERY_FILTER } from '../../../../function/content/discovery/search';

vi.mock('../../../general/message', () => ({
  useMessage: () => (key: string) => key,
}));

describe('package-owned tag discovery', () => {
  it('finds translated custom tags and descriptions and refreshes the filter menu when the GUI language changes', async () => {
    const store = createStore();
    store.set(LANGUAGE_ATOM, 'de');
    const client = new QueryClient();
    const elements: ContentElement[] = [
      {
        definition: {
          name: 'example',
          version: '1.0.0',
          type: 'plugin',
          tags: ['courtyards'],
          author: '',
          url: '',
          'display-name': 'Example',
          dependencies: {},
        },
        contents: {
          package: [],
          description: [
            { method: 'inline', language: 'de', content: 'Bessere Versorgung' },
            {
              method: 'inline',
              language: 'fr',
              content: 'Meilleur ravitaillement',
            },
          ],
          'tag-locales': {
            de: { courtyards: 'Burghöfe' },
            fr: { courtyards: 'Cours intérieures' },
          },
        },
        online: true,
        installed: false,
      },
    ];
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <Provider store={store}>
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        </Provider>
      );
    }
    const { result, rerender } = renderHook(
      ({ search }) =>
        useDiscovery(elements, {
          ...EMPTY_DISCOVERY_FILTER,
          search,
          wholeWords: true,
        }),
      { wrapper: Wrapper, initialProps: { search: 'Burghöfe' } },
    );
    await waitFor(() => expect(result.current.pending).toBe(0));
    expect(result.current.results.size).toBe(1);
    expect(result.current.tags).toContainEqual({
      value: 'courtyards',
      label: 'Burghöfe',
    });
    rerender({ search: 'Versorgung' });
    expect(result.current.results.size).toBe(1);
    await act(async () => {
      store.set(LANGUAGE_ATOM, 'fr');
    });
    await waitFor(() => expect(result.current.pending).toBe(0));
    expect(result.current.results.size).toBe(0);
    expect(result.current.tags).toContainEqual({
      value: 'courtyards',
      label: 'Cours intérieures',
    });
    rerender({ search: 'intérieures' });
    expect(result.current.results.size).toBe(1);
    rerender({ search: 'ravitaillement' });
    expect(result.current.results.size).toBe(1);
    rerender({ search: 'Burghöfe' });
    expect(result.current.results.size).toBe(0);
    rerender({ search: 'courtyards' });
    expect(result.current.results.size).toBe(1);
    client.clear();
  });
});
