import { expect, it } from 'vitest';
import { configuredKeys, qualifierState, settingRoots } from './qualifiers';

it('groups only explicit local values inside the exact scope, excluding locks and menu metadata', () => {
  expect(
    configuredKeys(
      ['aiSwapper'],
      {
        'aiSwapper.ai.rat.speech': { active: false },
        'aiSwapper.ai.rat.portrait': {},
        'aiSwapper.menu': {},
        'aiSwapperExtra.value': true,
        'aiSwapper.ai.wolf.speech': undefined,
      },
      { 'aiSwapper.ai.rat.portrait': {} },
    ),
  ).toEqual(['aiSwapper.ai.rat.speech']);
});
it('reports mixed groups and treats unspecified values as suggested', () => {
  expect(qualifierState(['one', 'two'], { one: 'required' })).toBe('mixed');
  expect(qualifierState(['one'], { one: 'unspecified' })).toBe('suggested');
  expect(qualifierState(['one'], { one: 'required' })).toBe('required');
});
it('collects nested category and group scopes without unrelated metadata', () => {
  expect(
    settingRoots({
      elements: [{ url: 'a.one' }],
      sections: { Child: { elements: [{ children: [{ url: 'a.two' }] }] } },
      description: { url: 'ignored' },
    }),
  ).toEqual(['a.one', 'a.two']);
});
