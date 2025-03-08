/**
 * Tests whether a simple situation of a partly valid config of 3 explicitly
 * activated extensions with 1 interdependency (extreme-is-the-new-normal depends on graphicsApiReplacer).
 * The invalid part is the load order in the full part of the config.
 *
 * Can be solved deterministically by the import strategies.
 *
 * To generate the data for a test like this, pause in the Webview2 Debugger and use the Console
 * to export the necessary parts using utility functions
 */

/* eslint-disable import/first */
import { describe, expect, test } from 'vitest';

import { ExtensionsState } from '../../../../../../function/extensions/extensions-state';
import { attemptStrategies } from '../attempt-strategies';
import { deserializeSimplifiedSerializedExtensionsStateFromExtensions } from '../../../../../../testing/dump-extensions-state';
import { extensionToID } from '../../../../../../function/extensions/dependency-management/dependency-resolution';
import { fullStrategy } from '../full-strategy';
import { sparseStrategy } from '../sparse-strategy';

import partlyInvalidConfigFile from './partly-invalid-config-file.json'

import extensions from './extensions.json'

// temp2.map((ext) => ({name: ext.name, version: ext.version, type: ext.type, definition: {...ext.definition, dependencies: Object.fromEntries(Object.entries(ext.definition.dependencies).map((v) => [v[0], v[1].raw]))}, configEntries: ext.configEntries}))

describe('attemptStrategies', () => {
  test('attemptStrategies on partly valid state', () => {
    const extensionsState: ExtensionsState =
      deserializeSimplifiedSerializedExtensionsStateFromExtensions(
        JSON.parse(JSON.stringify(extensions)),
      );

    const config = JSON.parse(JSON.stringify(partlyInvalidConfigFile));

    const strategyResultReport = attemptStrategies(
      config,
      extensionsState,
      () => {},
    );

    if (strategyResultReport.result === undefined) {
      expect(strategyResultReport.result !== undefined).toBe(true);
      return;
    }

    const { result: strategyResult } = strategyResultReport;

    expect(strategyResult.status === 'ok').toBe(true);

    if (strategyResult.status === 'ok') {
      const ids = strategyResult.newExtensionsState.activeExtensions.map(
        (ext) => extensionToID(ext),
      );

      // Because we did fall back to sparse strategy we expect to see that result
      expect(ids).toStrictEqual([
        'running-units@1.0.1',
        'aicloader@1.1.1',
        'extreme-is-the-new-normal@1.0.0',
        'maploader@1.0.0',
        'files@1.1.0',
        'ucp2-legacy@2.15.1',
        'graphicsApiReplacer@1.2.0',
        'winProcHandler@0.2.0',
      ]);
    }
  });

  test('fullStrategy on partly valid state', () => {
    const extensionsState: ExtensionsState =
      deserializeSimplifiedSerializedExtensionsStateFromExtensions(
        JSON.parse(JSON.stringify(extensions)),
      );

    const config = JSON.parse(JSON.stringify(partlyInvalidConfigFile));
    const strategyResult = fullStrategy(
      extensionsState,
      config,
      () => {},
    );

    expect(strategyResult.status === 'ok').toBe(false);

    if (strategyResult.status === 'error') {
      expect(strategyResult.code).toBe('MISSING_DEPENDENCIES_OR_WRONG_ORDER');
      if (strategyResult.code === 'MISSING_DEPENDENCIES_OR_WRONG_ORDER') {
        expect(strategyResult.dependencies.join('\n')).toBe('graphicsApiReplacer');
      }
    }
  });

  test('sparseStrategy on partly valid state with repair', () => {
    const extensionsState: ExtensionsState =
      deserializeSimplifiedSerializedExtensionsStateFromExtensions(
        JSON.parse(JSON.stringify(extensions)),
      );

    const config = JSON.parse(JSON.stringify(partlyInvalidConfigFile));
    const strategyResult = sparseStrategy(
      extensionsState,
      config,
      () => {},
      true,
    );

    expect(strategyResult.status === 'ok').toBe(true);

    if (strategyResult.status === 'ok') {
      const ids = strategyResult.newExtensionsState.activeExtensions.map(
        (ext) => extensionToID(ext),
      );

      expect(ids).toStrictEqual([
        'running-units@1.0.1',
        'aicloader@1.1.1',
        'extreme-is-the-new-normal@1.0.0',
        'maploader@1.0.0',
        'files@1.1.0',
        'ucp2-legacy@2.15.1',
        'graphicsApiReplacer@1.2.0',
        'winProcHandler@0.2.0',
      ]);

      
      const eids = strategyResult.newExtensionsState.explicitlyActivatedExtensions.map(
        (ext) => extensionToID(ext),
      );
      
      expect(eids).toStrictEqual([
        'running-units@1.0.1',
        'extreme-is-the-new-normal@1.0.0',
        'graphicsApiReplacer@1.2.0',
      ]);
    }
  });

  test('sparseStrategy on partly valid state with repair', () => {
    const extensionsState: ExtensionsState =
      deserializeSimplifiedSerializedExtensionsStateFromExtensions(
        JSON.parse(JSON.stringify(extensions)),
      );

    const config = JSON.parse(JSON.stringify(partlyInvalidConfigFile));
    const strategyResult = sparseStrategy(
      extensionsState,
      config,
      () => {},
    );

    expect(strategyResult.status === 'ok').toBe(true);

    if (strategyResult.status === 'ok') {
      const ids = strategyResult.newExtensionsState.activeExtensions.map(
        (ext) => extensionToID(ext),
      );

      expect(ids).toStrictEqual([
        'running-units@1.0.1',
        'aicloader@1.1.1',
        'extreme-is-the-new-normal@1.0.0',
        'maploader@1.0.0',
        'files@1.1.0',
        'ucp2-legacy@2.15.1',
        'graphicsApiReplacer@1.2.0',
        'winProcHandler@0.2.0',
      ]);

      
      const eids = strategyResult.newExtensionsState.explicitlyActivatedExtensions.map(
        (ext) => extensionToID(ext),
      );
      
      expect(eids).toStrictEqual([
        'running-units@1.0.1',
        'extreme-is-the-new-normal@1.0.0',
        'graphicsApiReplacer@1.2.0',
      ]);
    }
  });
});
