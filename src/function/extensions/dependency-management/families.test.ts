/* eslint-disable no-param-reassign, no-restricted-syntax */
import { createStore } from 'jotai';
import { describe, expect, it, vi } from 'vitest';
import {
  deserializeSimplifiedSerializedExtensionsStateFromExtensions,
  SimplifiedSerializedExtension,
} from '../../../testing/dump-extensions-state';
import DATA from '../../game-folder/initialization/tests/load-extensions-state.test.data.json';
import {
  addExtensionToExplicityActivatedExtensions as activate,
  selectExtensionFamilyMember as select,
  upgradeAllExtensions,
} from '../../../components/ucp-tabs/extension-manager/extensions-state-manipulation';
import { buildExtensionConfigurationDB as build } from '../../configuration/extension-configuration/build-extension-configuration-db';
import {
  assertFamilyChoices,
  familyConfigurationMembers,
  FamilyConflictError,
} from './families';
import { serializeUCPConfig } from '../../../config/ucp/config-files/config-files';
import { attemptStrategies } from '../../../components/ucp-tabs/common/importing/import-strategies/attempt-strategies';
import {
  EXTENSION_STATE_INTERFACE_ATOM,
  PREFERRED_EXTENSION_VERSION_ATOM,
} from '../state/state';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../configuration/state';
import { getStore } from '../../../hooks/jotai/base';

vi.mock('../../../hooks/jotai/base', async (original) => ({
  ...(await original<typeof import('../../../hooks/jotai/base')>()),
  getStore: vi.fn(),
}));

function fixture(appliedRoot = false) {
  const data = JSON.parse(
    JSON.stringify(DATA.EXTENSIONS),
  ) as SimplifiedSerializedExtension[];
  const source = data.find(
    (ext) => ext.name === 'Aggressive-AI-Behaviour-Applied',
  )!;
  data.push({
    ...source,
    name: 'Defensive-Applied',
    definition: { ...source.definition, name: 'Defensive-Applied' },
  });
  const bareData = data.find((ext) => ext.name === 'Aggressive-AI-Behaviour')!;
  data.push({
    ...bareData,
    name: 'Independent',
    definition: { ...bareData.definition, name: 'Independent' },
  });
  data.push({
    ...bareData,
    name: 'Bundle',
    definition: {
      ...bareData.definition,
      name: 'Bundle',
      dependencies: { 'Aggressive-AI-Behaviour-Applied': '^1.4.0' },
    },
  });
  const state =
    deserializeSimplifiedSerializedExtensionsStateFromExtensions(data);
  const bare = state.extensions.find(
    (ext) => ext.name === 'Aggressive-AI-Behaviour',
  )!;
  const applied = state.extensions.find((ext) => ext.name === source.name)!;
  const alternative = state.extensions.find(
    (ext) => ext.name === 'Defensive-Applied',
  )!;
  const independent = state.extensions.find(
    (ext) => ext.name === 'Independent',
  )!;
  const bundle = state.extensions.find((ext) => ext.name === 'Bundle')!;
  [bare, applied, alternative].forEach((ext) => {
    ext.definition.family = [
      {
        name: 'ai',
        ...(ext === (appliedRoot ? applied : bare) ? { root: true } : {}),
      },
    ];
  });
  return { state, bare, applied, alternative, independent, bundle };
}

describe('configuration family transitions', () => {
  it.each([false, true])(
    'switches Bare -> Applied -> another preset -> Bare with author-selected root %s',
    (appliedRoot) => {
      const { state, bare, applied, alternative } = fixture(appliedRoot);
      let next = build(select(state, bare));
      next = build(select(next, applied));
      expect(next.explicitlyActivatedExtensions.map((e) => e.name)).toEqual([
        applied.name,
      ]);
      expect(next.activeExtensions).toContain(bare);
      expect(
        familyConfigurationMembers(next)
          .filter((e) => e.definition.family)
          .map((e) => e.name),
      ).toEqual([applied.name]);
      next = build(select(next, alternative));
      expect(next.activeExtensions).not.toContain(applied);
      expect(next.explicitlyActivatedExtensions).toEqual([alternative]);
      next = build(select(next, bare));
      expect(next.explicitlyActivatedExtensions).toEqual([bare]);
      expect(next.activeExtensions).not.toContain(alternative);
      expect(
        Object.values(next.configuration.state).some((entry) =>
          Object.values(entry.modifications).some((value) =>
            [applied.name, alternative.name].includes(value.entityName),
          ),
        ),
      ).toBe(false);
    },
  );

  it('keeps unrelated versions and priority when replacing a family choice', () => {
    const { state, bare, applied, independent } = fixture();
    const before = activate(activate(state, bare), independent);
    const next = select(before, applied);
    expect(
      next.activeExtensions[0],
      JSON.stringify({
        before: before.activeExtensions.map((e) => e.name),
        after: next.activeExtensions.map((e) => e.name),
      }),
    ).toBe(independent);
    expect(next.activeExtensions.indexOf(applied)).toBe(1);
    expect(next.activeExtensions.indexOf(bare)).toBeGreaterThan(1);
    expect(select(next, applied)).toBe(next);
  });

  it('blocks a switch when an unrelated bundle still requires the old preset without mutating state or tree', () => {
    const { state, applied, alternative, bundle } = fixture();
    const before = activate(state, bundle);
    const { tree } = before.tree;
    const snapshot = tree.state;
    expect(() => select(before, alternative)).toThrow(FamilyConflictError);
    expect(() => select(before, alternative)).toThrow(
      `Bundle → ${applied.name}`,
    );
    expect(before.explicitlyActivatedExtensions).toEqual([bundle]);
    expect(before.activeExtensions).not.toContain(alternative);
    expect(before.tree.tree).toBe(tree);
    expect(tree.state).toBe(snapshot);
  });

  it('rejects explicit Bare plus an indirectly applied preset and two explicit presets', () => {
    const { state, bare, applied, alternative, bundle } = fixture();
    expect(() => activate(activate(state, bare), bundle)).toThrow(
      FamilyConflictError,
    );
    expect(() => activate(activate(state, applied), alternative)).toThrow(
      FamilyConflictError,
    );
  });

  it('replaces overlapping explicit memberships in one candidate', () => {
    const { state, bare, applied, independent } = fixture();
    independent.definition.family = [{ name: 'second', root: true }];
    applied.definition.family!.push({ name: 'second' });
    const before = activate(activate(state, bare), independent);
    const next = select(before, applied);
    expect(next.explicitlyActivatedExtensions).toEqual([applied]);
    expect(next.activeExtensions).not.toContain(independent);
    expect(next.activeExtensions).toContain(bare);
  });

  it('does not impose new family behavior on existing definitions', () => {
    const { state, bare, applied } = fixture();
    state.extensions.forEach((ext) => {
      delete ext.definition.family;
    });
    expect(
      activate(activate(state, bare), applied).explicitlyActivatedExtensions,
    ).toEqual([applied, bare]);
  });

  it('preserves sparse identity and selected choices through full and sparse reload', () => {
    const { state, applied } = fixture();
    const store = createStore();
    vi.mocked(getStore).mockReturnValue(store);
    store.set(EXTENSION_STATE_INTERFACE_ATOM, state);
    const next = build(select(state, applied));
    const config = serializeUCPConfig(
      {},
      next.configuration.defined,
      next.explicitlyActivatedExtensions,
      next.activeExtensions,
      {},
    );
    for (const sparseOnly of [false, true]) {
      const input = {
        ...config,
        ...(sparseOnly ? { 'config-full': undefined } : {}),
      };
      const result = attemptStrategies(input, state, () => {});
      expect(result.result?.status).toBe('ok');
      if (result.result?.status === 'ok')
        expect(
          result.result.newExtensionsState.explicitlyActivatedExtensions,
        ).toEqual([applied]);
    }
  });

  it('rejects conflicting imports, state commits and exports without changing live preferences', () => {
    const { state, bare, applied } = fixture();
    const store = createStore();
    vi.mocked(getStore).mockReturnValue(store);
    store.set(EXTENSION_STATE_INTERFACE_ATOM, state);
    store.set(PREFERRED_EXTENSION_VERSION_ATOM, { retained: '9.0.0' });
    const committed = store.get(EXTENSION_STATE_INTERFACE_ATOM);
    const active = build(select(state, applied));
    const invalid = {
      ...active,
      explicitlyActivatedExtensions: [applied, bare],
    };
    expect(() => assertFamilyChoices(invalid)).toThrow(FamilyConflictError);
    expect(() => store.set(EXTENSION_STATE_INTERFACE_ATOM, invalid)).toThrow(
      FamilyConflictError,
    );
    expect(store.get(EXTENSION_STATE_INTERFACE_ATOM)).toBe(committed);
    expect(() =>
      serializeUCPConfig(
        {},
        {},
        invalid.explicitlyActivatedExtensions,
        invalid.activeExtensions,
        {},
      ),
    ).toThrow(FamilyConflictError);
    const config = serializeUCPConfig(
      {},
      {},
      active.explicitlyActivatedExtensions,
      active.activeExtensions,
      {},
    );
    config['config-sparse']['load-order'].unshift({
      extension: bare.name,
      version: bare.version,
    });
    for (const sparseOnly of [false, true]) {
      expect(
        attemptStrategies(
          { ...config, ...(sparseOnly ? { 'config-full': undefined } : {}) },
          state,
          () => {},
        ).result,
      ).toBeUndefined();
      expect(store.get(PREFERRED_EXTENSION_VERSION_ATOM)).toEqual({
        retained: '9.0.0',
      });
    }
  });

  it('does not silently select a winner during version upgrades', () => {
    const { state, bare, applied } = fixture();
    const legacy = {
      ...state,
      activeExtensions: [applied, bare],
      explicitlyActivatedExtensions: [applied, bare],
    };
    expect(() => upgradeAllExtensions(legacy)).toThrow(FamilyConflictError);
    expect(legacy.explicitlyActivatedExtensions).toEqual([applied, bare]);
  });

  it('preserves user settings while a family preset temporarily requires other values', () => {
    const { state, bare, applied } = fixture();
    const entry = Object.entries(applied.configEntries)[0];
    Object.assign(entry[1].contents, { 'required-value': false });
    const store = createStore();
    store.set(CONFIGURATION_USER_REDUCER_ATOM, {
      type: 'reset',
      value: { [entry[0]]: true },
    });
    const selected = build(select(state, applied));
    store.set(EXTENSION_STATE_INTERFACE_ATOM, selected);
    expect(store.get(CONFIGURATION_FULL_REDUCER_ATOM)[entry[0]]).toBe(false);
    expect(store.get(CONFIGURATION_USER_REDUCER_ATOM)[entry[0]]).toBe(true);
    store.set(EXTENSION_STATE_INTERFACE_ATOM, build(select(selected, bare)));
    expect(store.get(CONFIGURATION_FULL_REDUCER_ATOM)[entry[0]]).toBe(true);
  });
});
