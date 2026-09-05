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

it('shows a mixed parent for a required child with untouched siblings', () => {
  const roots = ['category'];
  const full = { 'category.one': true, 'category.two': false };
  const user = { 'category.one': true };
  const qualifiers = { 'category.one': 'required' } as const;
  const editable = configuredKeys(roots, user, {});
  const scope = configuredKeys(roots, full, {});
  expect(qualifierState(editable, qualifiers, scope)).toBe('mixed');
  expect(qualifierState(editable, qualifiers)).toBe('required');
  expect(editable).toEqual(['category.one']);
  expect(
    qualifierState(scope, { ...qualifiers, 'category.two': 'required' }, scope),
  ).toBe('required');
  expect(qualifierState([], qualifiers, scope)).toBe('suggested');
});

it('selects every editable suboption for a whole-group change, preserving values', () => {
  const full = {
    'group.one': true,
    'group.child.two': false,
    'group.child.zero': 0,
    'group.locked': 7,
    'group.menu': {},
    'other.one': true,
  };
  const keys = configuredKeys(['group'], full, { 'group.locked': {} });
  expect(keys).toEqual(['group.one', 'group.child.two', 'group.child.zero']);
  const values = Object.fromEntries(
    keys.map((key) => [key, full[key as keyof typeof full]]),
  );
  expect(values).toEqual({
    'group.one': true,
    'group.child.two': false,
    'group.child.zero': 0,
  });
  expect(
    qualifierState(
      keys,
      Object.fromEntries(keys.map((key) => [key, 'required'])),
    ),
  ).toBe('required');
  expect(
    qualifierState(
      keys,
      Object.fromEntries(keys.map((key) => [key, 'suggested'])),
    ),
  ).toBe('suggested');
});
