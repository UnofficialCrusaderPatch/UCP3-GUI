import { describe, expect, test } from "vitest";
import { createStore } from "jotai";
import { waitFor } from "@testing-library/dom";
import { serializeUCPConfig, toYaml } from "../config-files";
import { CONFIGURATION_USER_REDUCER_ATOM, CONFIGURATION_FULL_REDUCER_ATOM, CONFIGURATION_QUALIFIER_REDUCER_ATOM } from "../../../../function/configuration/state";
import { EXTENSION_STATE_REDUCER_ATOM } from "../../../../function/extensions/state/state";

import TEST_DATA from './load-extensions-state.test.data.json';
import { deserializeSimplifiedSerializedExtensionsStateFromExtensions } from "../../../../testing/dump-extensions-state";
import { activateFirstTimeUseExtensions } from "../../../../function/game-folder/modifications/activate-first-time-use-extensions";

describe('serialize-ucp-config', () => {
  test('serializing extensions state to file', async () => {

    const TEST_STORE = createStore();
    const getStore = () => TEST_STORE;

    const state1 = deserializeSimplifiedSerializedExtensionsStateFromExtensions(
      JSON.parse(JSON.stringify(TEST_DATA.EXTENSIONS)),
    );

    const state2 = activateFirstTimeUseExtensions(state1).getOrThrow();

    getStore().set(EXTENSION_STATE_REDUCER_ATOM, state2);

    await waitFor(async () => {
      const userConfiguration = getStore().get(CONFIGURATION_USER_REDUCER_ATOM);
      const configuration = getStore().get(CONFIGURATION_FULL_REDUCER_ATOM);
      const extensionsState = getStore().get(EXTENSION_STATE_REDUCER_ATOM);
      const { activeExtensions } = extensionsState;
    
      const configurationQualifier = getStore().get(
        CONFIGURATION_QUALIFIER_REDUCER_ATOM,
      );
      
        const result = await serializeUCPConfig(userConfiguration, configuration, extensionsState.explicitlyActivatedExtensions, activeExtensions, configurationQualifier);
    
        expect(toYaml(result["config-full"]["load-order"]).trim()).toEqual(`
- extension: graphicsApiReplacer
  version: 1.2.0
- extension: winProcHandler
  version: 0.2.0
- extension: ucp2-legacy-defaults
  version: 2.15.1
- extension: ucp2-vanilla-fixed-aiv
  version: 2.15.1
- extension: ucp2-aic-patch
  version: 2.15.1
- extension: ucp2-ai-files
  version: 2.15.1
- extension: aiSwapper
  version: 1.1.0
- extension: aivloader
  version: 1.0.0
- extension: files
  version: 1.1.0
- extension: aicloader
  version: 1.1.0
- extension: textResourceModifier
  version: 0.3.0
- extension: gmResourceModifier
  version: 0.2.0
- extension: ucp2-legacy
  version: 2.15.1`.trim());

  expect(toYaml(result["config-sparse"]["load-order"]).trim()).toEqual(`
- extension: graphicsApiReplacer
  version: 1.2.0
- extension: ucp2-legacy-defaults
  version: 2.15.1`.trim());
    })

  })
})