import { describe, expect, it } from 'vitest';
import { ContentElement } from '../types/content-element';
import packageTagLabel from './tag-localization';

const element = (): ContentElement => ({
  definition: {
    name: 'example',
    version: '1.0.0',
    tags: ['castles'],
    type: 'plugin',
    author: '',
    url: '',
    'display-name': '',
    dependencies: {},
  },
  contents: {
    description: [],
    package: [],
    'tag-locales': { en: { castles: 'Castles' }, de: { castles: 'Burgen' } },
  },
  online: true,
  installed: false,
});

describe('package tag localization', () => {
  it('uses the selected Store locale, then language family, then English', () => {
    const content = element();
    expect(packageTagLabel(content, 'castles', 'de')).toBe('Burgen');
    expect(packageTagLabel(content, 'castles', 'de-AT')).toBe('Burgen');
    expect(packageTagLabel(content, 'castles', 'fr')).toBe('Castles');
    expect(packageTagLabel(content, 'absent', 'en')).toBeUndefined();
  });
  it('prefers installed labels within each locale but does not hide a selected-language Store translation behind English', () => {
    const content = element();
    content.extension = {
      locales: { en: { 'tags.castles': 'Local castles' } },
    } as unknown as NonNullable<ContentElement['extension']>;
    expect(packageTagLabel(content, 'castles', 'de')).toBe('Burgen');
    content.extension.locales.de = { 'tags.castles': 'Eigene Burgen' };
    expect(packageTagLabel(content, 'castles', 'de')).toBe('Eigene Burgen');
  });
  it('ignores malformed or empty presentation labels', () => {
    const content = element();
    content.contents['tag-locales']!.de.castles = 7 as unknown as string;
    expect(packageTagLabel(content, 'castles', 'de')).toBe('Castles');
    content.contents['tag-locales']!.en.castles = '  ';
    expect(packageTagLabel(content, 'castles', 'de')).toBeUndefined();
  });
});
