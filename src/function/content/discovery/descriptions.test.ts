import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ContentElement } from '../types/content-element';
import { fetchDescription } from '../store/fetch';
import { descriptionQuery, resolveContentDescription } from './descriptions';

vi.mock('../store/fetch', () => ({ fetchDescription: vi.fn() }));
const content = (
  description: ContentElement['contents']['description'],
): ContentElement => ({
  definition: {
    name: 'example',
    version: '1.0.0',
    'display-name': 'Example',
    type: 'plugin',
    author: '',
    url: '',
    dependencies: {},
  },
  contents: { description, package: [] },
  installed: false,
  online: true,
});

beforeEach(() => vi.resetAllMocks());

describe('one selected-language description contract', () => {
  it('prefers selected language regardless of source order and uses default fallback', async () => {
    const element = content([
      { method: 'inline', language: 'en', content: 'English' },
      { method: 'inline', language: 'default', content: 'Default' },
      { method: 'inline', language: 'de', content: 'Deutsch' },
    ]);
    expect(await resolveContentDescription(element, 'de')).toMatchObject({
      text: 'Deutsch',
      language: 'de',
    });
    expect(await resolveContentDescription(element, 'fa')).toMatchObject({
      text: 'Default',
      language: 'default',
    });
    expect(descriptionQuery(element, 'de').queryKey).not.toEqual(
      descriptionQuery(element, 'fa').queryKey,
    );
    expect(fetchDescription).not.toHaveBeenCalled();
  });
  it('reports incomplete indexing if selected-language fetch fails, retaining usable fallback', async () => {
    vi.mocked(fetchDescription).mockRejectedValue(new Error('offline'));
    const element = content([
      { method: 'online', language: 'de', url: 'https://example.invalid/de' },
      { method: 'inline', language: 'default', content: 'Cached text' },
    ]);
    expect(await resolveContentDescription(element, 'de')).toEqual({
      text: 'Cached text',
      language: 'default',
      incomplete: true,
    });
  });
  it('uses installed language-aware I/O and invalidates local descriptions after discovery reload', async () => {
    const element = content([]);
    const read = vi.fn().mockResolvedValue('Lokale Beschreibung');
    element.extension = {
      io: {
        path: '/plugins/example-1.0.0',
        fetchDescription: read,
        descriptionRevision: 1,
      },
    } as unknown as NonNullable<ContentElement['extension']>;
    const previous = descriptionQuery(element, 'de').queryKey;
    expect(await resolveContentDescription(element, 'de')).toMatchObject({
      text: 'Lokale Beschreibung',
      incomplete: false,
    });
    expect(read).toHaveBeenCalledWith('de');
    element.extension.io.descriptionRevision = 2;
    expect(descriptionQuery(element, 'de').queryKey).not.toEqual(previous);
  });
  it('limits background network reads across a catalog to four simultaneous requests', async () => {
    let active = 0;
    let maximum = 0;
    vi.mocked(fetchDescription).mockImplementation(async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => {
        setTimeout(resolve, 1);
      });
      active -= 1;
      return 'Description';
    });
    await Promise.all(
      Array.from({ length: 17 }, (_, i) =>
        resolveContentDescription(
          content([
            {
              method: 'online',
              language: 'default',
              url: `https://example.invalid/${i}`,
            },
          ]),
          'en',
        ),
      ),
    );
    expect(maximum).toBe(4);
    expect(active).toBe(0);
  });
});
