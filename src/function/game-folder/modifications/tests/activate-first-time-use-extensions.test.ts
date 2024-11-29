import { describe, expect, test } from 'vitest';
import {
  deserializeSimplifiedSerializedExtensionsStateFromExtensions,
  SimplifiedSerializedExtension,
} from '../../../../testing/dump-extensions-state';
import { activateFirstTimeUseExtensions } from '../activate-first-time-use-extensions';
import { createExtensionID } from '../../../global/constants/extension-id';

import extensions from './extensions.json'
import { createBasicExtensionsState } from '../../../extensions/state/init';
import { setupExtensionsStateConfiguration } from '../../initialization/load-extensions-state';

describe('activateFirstTimeUseExtensions', () => {
  test('expect valid state to work', () => {
    const extensionsState =
      deserializeSimplifiedSerializedExtensionsStateFromExtensions(
        JSON.parse(JSON.stringify(extensions)),
      );

    const result = activateFirstTimeUseExtensions(extensionsState);

    expect(result.isOk()).toBe(true);

    const state = result.getOrThrow();

    expect(
      state.activeExtensions.map((ext) => createExtensionID(ext)),
    ).toStrictEqual([
      'graphicsApiReplacer@1.2.0',
      'winProcHandler@0.2.0',
      'ucp2-legacy-defaults@2.15.1',
      'ucp2-vanilla-fixed-aiv@2.15.1',
      'ucp2-aic-patch@2.15.1',
      'ucp2-ai-files@2.15.1',
      'aiSwapper@1.1.0',
      'aivloader@1.0.0',
      'files@1.1.0',
      'aicloader@1.1.0',
      'textResourceModifier@0.3.0',
      'gmResourceModifier@0.2.0',
      'ucp2-legacy@2.15.1',
    ]);
  });

  test('expect invalid state to fail', () => {
    const filteredExtensions = JSON.parse(JSON.stringify(extensions)).filter(
      (e: SimplifiedSerializedExtension) => e.name !== 'aiSwapper',
    );
    const extensionsState =
      deserializeSimplifiedSerializedExtensionsStateFromExtensions(
        filteredExtensions,
      );

    expect(() => activateFirstTimeUseExtensions(extensionsState)).toThrowError(
      'Error: Could not fix dependency issues: ucp2-legacy-defaults: 2.15.1 ()',
    );
  });

  test('expect empty state to fail', () => {
    const extensionsState =
      createBasicExtensionsState([], '1.0.7', '3.0.5');

    expect(activateFirstTimeUseExtensions(extensionsState).isErr()).toBe(true);
  });

  test('expect empty state to fail', async () => {
    const extensionsState =
      createBasicExtensionsState([], '1.0.7', '3.0.5');

    await setupExtensionsStateConfiguration(extensionsState, '', '');

    expect(activateFirstTimeUseExtensions(extensionsState).isErr()).toBe(true);
  });
});
