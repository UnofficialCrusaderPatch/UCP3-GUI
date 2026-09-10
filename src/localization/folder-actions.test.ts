import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseDocument } from 'yaml';
import { createMessageResolver } from './localization';

const readCatalog = (language: string) => {
  const document = parseDocument(
    readFileSync(`resources/lang/sources/${language}.yaml`, 'utf8'),
    { uniqueKeys: true },
  );
  expect(document.errors).toEqual([]);
  return document.toJS() as Record<string, string>;
};
const keys = [
  'extensions.folder.open',
  'extensions.folder.error.title',
  'extensions.folder.error.message',
  'extensions.extension.shell.open',
  'extensions.extension.shell.reveal',
  'extensions.extension.shell.parent',
];

describe('folder action localization', () => {
  it('supplies English and German labels and preserves catalog encodings', () => {
    const en = readCatalog('en');
    const de = readCatalog('de');
    keys.forEach((key) => {
      expect(en[key]).toBeTruthy();
      expect(de[key]).toBeTruthy();
      expect(de[key]).not.toMatch(/�|Ã|â€|{{/);
    });
    expect(de['extensions.folder.open']).toContain('öffnen');
  });

  it.each(['ch', 'es', 'fa', 'fr', 'hu', 'ru', 'tr'])(
    'uses the existing English fallback for missing %s labels',
    (language) => {
      const en = readCatalog('en');
      const catalog = readCatalog(language);
      const localize = createMessageResolver(language, catalog, 'en', en);
      keys.forEach((key) =>
        expect(localize(key)).toBe(catalog[key] || en[key]),
      );
    },
  );
});
