import { describe, expect, it } from 'vitest';
import {
  discoveryTags,
  groupFamilies,
  normalizeFamilies,
  normalizeTags,
} from './metadata';
import {
  createDiscoverySearch,
  descriptionText,
  EMPTY_DISCOVERY_FILTER,
  normalizeSearch,
} from './search';

const root = {
  id: 'default@1',
  name: 'default',
  family: [{ name: 'example', root: true }],
};
const files = { id: 'files@1', name: 'files', family: [{ name: 'example' }] };
const alternative = {
  id: 'alternative@1',
  name: 'alternative',
  family: [{ name: 'example' }],
};

describe('family projection over real extension identities', () => {
  it('keeps installed members flat when the root exists only in the Store', () => {
    expect(groupFamilies([files], [files])).toEqual({
      groups: [],
      ungrouped: [files],
    });
    expect(groupFamilies([root, files], [root, files]).groups[0].root).toBe(
      root,
    );
  });
  it('uses the author-selected Applied root and preserves member identity/order', () => {
    const ordered = Object.freeze([alternative, files, root]);
    const result = groupFamilies([...ordered], [...ordered]);
    expect(result.groups[0]).toEqual({
      id: 'example',
      root,
      members: [alternative, files],
      contextual: false,
    });
    expect(ordered).toEqual([alternative, files, root]);
  });
  it('retains a nonmatching installed root as context for a matching child', () => {
    const result = groupFamilies([alternative], [root, files, alternative]);
    expect(result.groups[0]).toEqual({
      id: 'example',
      root,
      members: [alternative],
      contextual: true,
    });
  });
  it('does not guess between conflicting root identities', () => {
    const other = { ...root, name: 'impostor', id: 'impostor@1' };
    expect(groupFamilies([files, root, other], [files, root, other])).toEqual({
      groups: [],
      ungrouped: [files, root, other],
    });
  });
  it('allows several versions of one root, without rewriting a selected member version', () => {
    const newer = { ...root, id: 'default@2' };
    const result = groupFamilies([root, newer, files], [root, newer, files]);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0].members).toEqual([newer, files]);
  });
  it('supports overlapping memberships as references, without recursive trees', () => {
    const second = {
      id: 'second@1',
      name: 'second',
      family: [{ name: 'another', root: true }],
    };
    const shared = {
      ...files,
      family: [{ name: 'example' }, { name: 'another' }],
    };
    const result = groupFamilies(
      [root, second, shared],
      [root, second, shared],
    );
    expect(result.groups.map((group) => group.members)).toEqual([
      [shared],
      [shared],
    ]);
    expect(result.ungrouped).toEqual([]);
  });
});

describe('additive discovery metadata', () => {
  it('normalizes author tags and rejects malformed grouping without dropping an extension', () => {
    expect(normalizeTags([' AI ', 'ai', '', 42, 'AIC'])).toEqual(['ai', 'aic']);
    expect(normalizeFamilies([{ name: 'family', root: 'true' }])).toEqual([]);
    expect(
      normalizeFamilies([{ name: 'family' }, { name: 'family', root: true }]),
    ).toEqual([]);
    expect(normalizeFamilies([{ name: 'family', root: false }])).toEqual([
      { name: 'family' },
    ]);
  });
  it("derives only the member's known facts, without inheriting an Applied sibling", () => {
    expect(
      discoveryTags(
        {
          family: files.family,
          capabilities: { files: true, configuration: false },
        },
        'plugin',
      ),
    ).toEqual(['plugin', 'family', 'files']);
    expect(discoveryTags({}, 'plugin')).toEqual(['plugin']);
  });
});

describe('localized name and visible-description search', () => {
  const documents = [
    {
      id: 'a',
      name: 'apex-ai',
      displayName: 'ApeX AI',
      description: '# Defensive castles\n\nFast **archers**, careful economy.',
      tags: ['ai', 'aiv'],
      tagText: 'AI Castles',
    },
    {
      id: 'b',
      name: 'bare-files',
      displayName: '',
      description: 'Dateien für größere Burgen.',
      tags: ['files'],
      tagText: 'Enthält Dateien',
    },
    {
      id: 'c',
      name: 'archers',
      displayName: 'Archers',
      description: 'A different plugin.',
      tags: ['ai'],
      tagText: 'AI',
    },
  ];
  const search = createDiscoverySearch(documents, 'de');
  const run = (query: string) =>
    search({ ...EMPTY_DISCOVERY_FILTER, search: query });
  it('matches mixed name/description words, prefixes, substrings and exact phrases', () => {
    expect([...run('apex economy').keys()]).toEqual(['a']);
    expect(run('defens').has('a')).toBe(true);
    expect(run('are-fil').has('b')).toBe(true);
    expect([...run('"careful economy"').keys()]).toEqual(['a']);
    expect(run('"archers careful"').size).toBe(0);
  });
  it('ranks an exact name above a description match and marks approximate results', () => {
    const result = run('archers');
    expect(result.get('c')!.score).toBeGreaterThan(result.get('a')!.score);
    expect(result.get('a')!.excerpt).toContain('archers');
    expect(run('defensve').get('a')?.approximate).toBe(true);
  });
  it('combines query words with Any/All tags on each member independently', () => {
    expect([
      ...search({ search: '', tags: ['ai', 'aiv'], match: 'all' }).keys(),
    ]).toEqual(['a']);
    expect([
      ...search({ search: '', tags: ['ai', 'files'], match: 'any' }).keys(),
    ]).toEqual(['a', 'b', 'c']);
    expect(
      search({ search: 'economy', tags: ['files'], match: 'any' }).size,
    ).toBe(0);
  });
  it('handles whitespace, technical-name fallback, accents and non-Latin scripts', () => {
    expect(run('  BARE-FILES  ').has('b')).toBe(true);
    expect(run('grossere').has('b')).toBe(true);
    expect(run('großere').has('b')).toBe(true);
    expect(normalizeSearch('  ÉCONOMIE ', 'fr')).toBe('economie');
    expect(normalizeSearch('مي\u200cشود', 'fa')).toBe(
      normalizeSearch('می شود'.replace(' ', ''), 'fa'),
    );
    expect(normalizeSearch('城堡', 'ch')).toBe('城堡');
    expect(normalizeSearch('AI', 'tr')).toBe('ai');
  });
  it('extracts readable Markdown without matching hidden markup or link destinations', () => {
    const text = descriptionText(
      '# Economy\n\n[Visible label](https://secret-host.invalid/path)\n\n<script>hiddenWord</script>',
    );
    expect(text).toContain('Economy Visible label');
    expect(text).not.toContain('secret-host');
    expect(text).not.toContain('hiddenWord');
  });
  it('whole-word mode rejects word fragments and approximate matches while retaining punctuation and phrases', () => {
    const exact = (query: string) =>
      search({ ...EMPTY_DISCOVERY_FILTER, search: query, wholeWords: true });
    expect(exact('archers').has('a')).toBe(true);
    expect(exact('arch').size).toBe(0);
    expect(exact('defensve').size).toBe(0);
    expect(exact('files').has('b')).toBe(true);
    expect(exact('"careful economy"').has('a')).toBe(true);
    expect(exact('"careful econ"').size).toBe(0);
  });
  it('ranks translated tag matches ahead of unrelated description substrings', () => {
    const find = createDiscoverySearch(
      [
        { ...documents[0], id: 'tagged', tagText: 'ai KI aiv KI-Burgen' },
        {
          ...documents[1],
          id: 'unrelated',
          description: 'Improved attacking units.',
          tagText: 'files Dateien',
        },
      ],
      'de',
    );
    const result = find({ ...EMPTY_DISCOVERY_FILTER, search: 'KI' });
    expect(result.get('tagged')!.score).toBeGreaterThan(
      result.get('unrelated')!.score,
    );
    expect(result.get('tagged')!.excerpt).toBe('');
    expect([
      ...find({
        ...EMPTY_DISCOVERY_FILTER,
        search: 'KI',
        wholeWords: true,
      }).keys(),
    ]).toEqual(['tagged']);
  });
  it('uses Chinese word boundaries when whole-word matching text without spaces', () => {
    const find = createDiscoverySearch(
      [{ ...documents[0], description: '建造城堡', tagText: '城堡' }],
      'ch',
    );
    expect(
      find({ ...EMPTY_DISCOVERY_FILTER, search: '城堡', wholeWords: true })
        .size,
    ).toBe(1);
    expect(
      find({ ...EMPTY_DISCOVERY_FILTER, search: '城', wholeWords: true }).size,
    ).toBe(0);
  });
});
