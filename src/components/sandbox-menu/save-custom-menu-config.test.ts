import { createStore } from 'jotai';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getStore } from '../../hooks/jotai/base';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../function/configuration/state';
import saveConfig from './save-custom-menu-config';

const fixtures = vi.hoisted(() => ({
  baseline: {} as Record<string, unknown>,
}));

vi.mock('../../hooks/jotai/base', () => ({ getStore: vi.fn() }));
vi.mock('../../util/scripts/logging', () => ({
  ConsoleLogger: { debug: vi.fn() },
}));
vi.mock('../../function/configuration/derived-state', async () => {
  const { atom } = await import('jotai');
  return { CONFIGURATION_DEFAULTS_REDUCER_ATOM: atom(() => fixtures.baseline) };
});

const aiKey = 'aiSwapper.ai.rat.aic';
const selectedAi = { name: 'Custom Rat', root: 'custom/rat', active: true };
const baselineAi = { name: 'Pack Rat', root: 'pack/rat', active: true };

beforeEach(() => {
  vi.mocked(getStore).mockReturnValue(createStore());
  fixtures.baseline = {};
});

describe('saving custom-menu configuration', () => {
  it('removes the last AI from user and full config after adding and applying it', () => {
    saveConfig('aiSwapper', {
      menu: { rat: [selectedAi] },
      'ai.rat.aic': selectedAi,
    });
    expect(getStore().get(CONFIGURATION_FULL_REDUCER_ATOM)[aiKey]).toEqual(
      selectedAi,
    );
    // Applying resets the touched state before the submenu is reopened.
    getStore().set(CONFIGURATION_TOUCHED_REDUCER_ATOM, { type: 'clear-all' });

    saveConfig('aiSwapper', { menu: {}, 'ai.rat.aic': undefined });

    expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual({
      'aiSwapper.menu': {},
    });
    expect(getStore().get(CONFIGURATION_FULL_REDUCER_ATOM)).toEqual({
      'aiSwapper.menu': {},
    });
    expect(getStore().get(CONFIGURATION_TOUCHED_REDUCER_ATOM)[aiKey]).toBe(
      true,
    );
  });

  it('restores the plugin baseline by URL when the user removes an AI', () => {
    fixtures.baseline = { [aiKey]: baselineAi };
    saveConfig('aiSwapper', { 'ai.rat.aic': selectedAi });
    saveConfig('aiSwapper', { 'ai.rat.aic': undefined });

    expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual({});
    expect(getStore().get(CONFIGURATION_FULL_REDUCER_ATOM)).toEqual({
      [aiKey]: baselineAi,
    });
  });

  it('keeps remaining overrides and unrelated namespaces when clearing a component', () => {
    const portraitKey = 'aiSwapper.ai.rat.portrait';
    const otherKey = 'aiSwapperExtra.enabled';
    fixtures.baseline = {
      [aiKey]: baselineAi,
      [portraitKey]: baselineAi,
      [otherKey]: false,
    };
    getStore().set(CONFIGURATION_FULL_REDUCER_ATOM, {
      type: 'set-multiple',
      value: { [otherKey]: true },
    });
    saveConfig('aiSwapper', {
      'ai.rat.aic': selectedAi,
      'ai.rat.portrait': selectedAi,
    });

    // A custom menu may return only the keys it changed.
    saveConfig('aiSwapper', { 'ai.rat.aic': undefined });
    expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual({
      [portraitKey]: selectedAi,
    });
    expect(getStore().get(CONFIGURATION_FULL_REDUCER_ATOM)).toEqual({
      [aiKey]: baselineAi,
      [portraitKey]: selectedAi,
      [otherKey]: true,
    });
  });

  it('saves a remaining AI and explicit inactive values without clearing them', () => {
    const inactiveAi = { ...baselineAi, active: false };
    saveConfig('aiSwapper', { 'ai.rat.aic': selectedAi });
    saveConfig('aiSwapper', {
      'ai.rat.aic': baselineAi,
      'ai.rat.portrait': inactiveAi,
      defaultLanguage: null,
    });
    expect(getStore().get(CONFIGURATION_FULL_REDUCER_ATOM)).toEqual({
      [aiKey]: baselineAi,
      'aiSwapper.ai.rat.portrait': inactiveAi,
      'aiSwapper.defaultLanguage': null,
    });
    expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).toEqual(
      getStore().get(CONFIGURATION_FULL_REDUCER_ATOM),
    );
  });
});
