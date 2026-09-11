import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createStore } from 'jotai';
import yaml from 'yaml';
import semver from 'semver';
import { getStore } from '../../hooks/jotai/base';
import { ConfigFile, Extension } from '../../config/ucp/common';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
  createEmptyConfigurationState,
} from '../../function/configuration/state';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../function/extensions/state/state';
import { createPluginConfigFromCurrentState } from '../ucp-tabs/config-editor/buttons/export-as-plugin-button';
import { constructUserConfigObjects } from '../ucp-tabs/common/importing/import-button-callback';
import { fullStrategy } from '../ucp-tabs/common/importing/import-strategies/full-strategy';
import { buildExtensionConfigurationDB } from '../../function/configuration/extension-configuration/build-extension-configuration-db';
import { parseConfigEntries } from '../../function/extensions/discovery/parse-config-entries';
import { createGetCurrentConfigFunction } from './sandbox-menu-functions';
import saveConfig from './save-custom-menu-config';

vi.mock('../../hooks/jotai/base', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../hooks/jotai/base')>()),
  getStore: vi.fn(),
}));

const key = 'textureSwapper.order';
const order = ['Winter/terrain/snow', 'Arabia/terrain/sand', 'Absent/terrain'];
const choicesKey = 'textureSwapper.choices';
const choices = [
  { group: 'Winter/terrain/snow', enabled: false },
  {
    group: 'Arabia/terrain/sand',
    required: true,
    selection: {
      folder: 'gm',
      file: 'gm/tile_land8.gm1',
      images: { first: 64, count: 32 },
    },
  },
  {
    group: 'Absent/terrain',
    selection: { file: 'gm/tile_castle.gm1', images: [517, 518] },
  },
];

function extension(name: string, type: 'module' | 'plugin'): Extension {
  return {
    name,
    version: new semver.SemVer('1.0.0'),
    type,
    definition: {
      name,
      version: '1.0.0',
      dependencies:
        type === 'plugin' ? { textureSwapper: new semver.Range('^1.0.0') } : {},
    },
    configEntries: {},
    ui: [],
  } as unknown as Extension;
}

beforeEach(() => {
  vi.mocked(getStore).mockReturnValue(createStore());
  const active = [
    extension('Winter', 'plugin'),
    extension('Arabia', 'plugin'),
    extension('textureSwapper', 'module'),
  ];
  const state = getStore().get(EXTENSION_STATE_REDUCER_ATOM);
  getStore().set(EXTENSION_STATE_REDUCER_ATOM, {
    ...state,
    activeExtensions: active,
    explicitlyActivatedExtensions: active,
    extensions: active,
    installedExtensions: [],
    configuration: createEmptyConfigurationState(),
  });
});

describe('texture order uses UCP persistence without menu-only state', () => {
  it.each(['suggested', 'required'] as const)(
    'round-trips %s order through config export, import and plugin creation',
    async (qualifier) => {
      saveConfig('textureSwapper', { order, choices });
      getStore().set(CONFIGURATION_QUALIFIER_REDUCER_ATOM, {
        type: 'set-multiple',
        value: { [key]: qualifier, [choicesKey]: qualifier },
      });
      const before = getStore().get(EXTENSION_STATE_REDUCER_ATOM);
      const exported = await createPluginConfigFromCurrentState();
      const user = yaml.parse(yaml.stringify(exported.user)) as ConfigFile;
      const plugin = yaml.parse(yaml.stringify(exported.plugin)) as ConfigFile;

      expect(
        user['config-full']?.['load-order'].map((e) => e.extension),
      ).toEqual(['textureSwapper', 'Arabia', 'Winter']);
      expect(plugin['config-sparse']['load-order']).toEqual(
        user['config-sparse']['load-order'],
      );
      expect(constructUserConfigObjects(user)).toEqual({
        userConfig: { [key]: order, [choicesKey]: choices },
        userConfigQualifiers: { [key]: qualifier, [choicesKey]: qualifier },
      });
      expect(constructUserConfigObjects(plugin)).toEqual(
        constructUserConfigObjects(user),
      );

      // Exercise actual reconstruction of the Content list, not just YAML parsing.
      const result = fullStrategy(
        {
          ...before,
          activeExtensions: [],
          explicitlyActivatedExtensions: [],
          installedExtensions: before.extensions,
        },
        user,
        vi.fn(),
      );
      expect(result.status).toBe('ok');
      if (result.status !== 'ok') throw new Error('full import failed');
      expect(
        result.newExtensionsState.activeExtensions.map((e) => e.name),
      ).toEqual(before.activeExtensions.map((e) => e.name));

      // Start from a fresh store and restore only what the import produces.
      vi.mocked(getStore).mockReturnValue(createStore());
      getStore().set(EXTENSION_STATE_REDUCER_ATOM, result.newExtensionsState);
      const restored = constructUserConfigObjects(user);
      getStore().set(CONFIGURATION_USER_REDUCER_ATOM, {
        type: 'reset',
        value: restored.userConfig,
      });
      getStore().set(CONFIGURATION_FULL_REDUCER_ATOM, {
        type: 'reset',
        value: restored.userConfig,
      });
      getStore().set(CONFIGURATION_QUALIFIER_REDUCER_ATOM, {
        type: 'reset',
        value: restored.userConfigQualifiers,
      });
      expect(
        (await createGetCurrentConfigFunction('textureSwapper')()).user,
      ).toEqual({ order, choices });
      expect((await createPluginConfigFromCurrentState()).user).toEqual(
        exported.user,
      );

      // Activate the exported preset as content; suggested/required semantics survive.
      const preset = extension('Preset', 'plugin');
      preset.configEntries = parseConfigEntries(plugin).configEntries;
      const merged = buildExtensionConfigurationDB({
        ...result.newExtensionsState,
        activeExtensions: [
          preset,
          ...result.newExtensionsState.activeExtensions,
        ],
      });
      expect(merged.configuration.defined[key]).toEqual(order);
      expect(merged.configuration.defined[choicesKey]).toEqual(choices);
      expect(
        qualifier === 'required'
          ? merged.configuration.locks[key].lockedValue
          : merged.configuration.suggestions[key].suggestedValue,
      ).toEqual(order);
      getStore().set(EXTENSION_STATE_REDUCER_ATOM, merged);
      const { baseline } =
        await createGetCurrentConfigFunction('textureSwapper')();
      const choiceMetadata = (
        baseline.choices as {
          modifications: {
            value: { content: unknown; qualifier: string; entityName: string };
          };
        }
      ).modifications.value;
      expect(choiceMetadata.content).toEqual(choices);
      expect(choiceMetadata.qualifier).toBe(qualifier);
      if (qualifier === 'required') {
        expect(choiceMetadata.entityName).toBe('Preset');
        saveConfig('textureSwapper', { order: [], choices: [] });
        expect(
          (await createGetCurrentConfigFunction('textureSwapper')()).user,
        ).toEqual({ order, choices });
      }
    },
  );

  it('Defaults clears saved order, and missing pack IDs are not silently lost', async () => {
    saveConfig('textureSwapper', { order });
    expect(
      (await createGetCurrentConfigFunction('textureSwapper')()).user,
    ).toEqual({ order });
    const snapshot = await createPluginConfigFromCurrentState();
    expect(
      constructUserConfigObjects(snapshot.user as ConfigFile).userConfig[key],
    ).toEqual(order);
    saveConfig('textureSwapper', { order: undefined });
    expect(getStore().get(CONFIGURATION_FULL_REDUCER_ATOM)).not.toHaveProperty(
      key,
    );
    expect(getStore().get(CONFIGURATION_USER_REDUCER_ATOM)).not.toHaveProperty(
      key,
    );
    expect(
      (await createGetCurrentConfigFunction('textureSwapper')()).user,
    ).toEqual({});
  });
});
