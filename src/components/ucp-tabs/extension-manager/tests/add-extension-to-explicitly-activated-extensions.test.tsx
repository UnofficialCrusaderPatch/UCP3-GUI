// import { createStore } from "jotai";
import { describe, expect, test } from "vitest";

import {
  parse as fromYaml,
  stringify as toYaml,
} from 'yaml';
import EXTENSIONS_STATE_JSON from 'config/ucp/config-files/tests/load-extensions-state.test.data.json'
import { deserializeSimplifiedSerializedExtensionsStateFromExtensions, SimplifiedSerializedExtension } from "../../../../testing/dump-extensions-state";
import { addExtensionToExplicityActivatedExtensions } from "../extensions-state-manipulation";
import { Extension } from "../../../../config/ucp/common";
import { serializeUCPConfig } from "../../../../config/ucp/config-files/config-files";
import { createBasicExtensionsState } from "../../../../function/extensions/state/init";
import { attemptStrategies } from "../../common/importing/import-strategies/attempt-strategies";

describe('add-extension-to-explicitly-activated-extensions', () => {
  test('whether adding explicitly active extensions works without serialization', () => {
    // const TEST_STORE = createStore();

    const state1 = deserializeSimplifiedSerializedExtensionsStateFromExtensions(EXTENSIONS_STATE_JSON.EXTENSIONS as unknown as SimplifiedSerializedExtension[]) ;

    const state2 = addExtensionToExplicityActivatedExtensions(state1, state1.installedExtensions.filter((ext: Extension) => ext.name === 'files').at(0)!);

    expect(state2.explicitlyActivatedExtensions.map((ext) => ext.name)).toStrictEqual(['files']);


    const state3 = addExtensionToExplicityActivatedExtensions(state2, state2.installedExtensions.filter((ext: Extension) => ext.name === 'aiSwapper').at(0)!);

    expect(state3.explicitlyActivatedExtensions.map((ext) => ext.name)).toStrictEqual(['aiSwapper', 'files']);

    const state4 = addExtensionToExplicityActivatedExtensions(state3, state3.installedExtensions.filter((ext: Extension) => ext.name === 'graphicsApiReplacer').at(0)!);

    expect(state4.explicitlyActivatedExtensions.map((ext) => ext.name)).toStrictEqual(['graphicsApiReplacer', 'aiSwapper', 'files']);

  })

  test('whether adding explicitly active extensions works with serialization', () => {
    // const TEST_STORE = createStore();

    const state1 = deserializeSimplifiedSerializedExtensionsStateFromExtensions(EXTENSIONS_STATE_JSON.EXTENSIONS as unknown as SimplifiedSerializedExtension[]) ;

    const state2 = addExtensionToExplicityActivatedExtensions(state1, state1.installedExtensions.filter((ext: Extension) => ext.name === 'files').at(0)!);

    expect(state2.explicitlyActivatedExtensions.map((ext) => ext.name)).toStrictEqual(['files']);

    const state3 = addExtensionToExplicityActivatedExtensions(state2, state2.installedExtensions.filter((ext: Extension) => ext.name === 'aiSwapper').at(0)!);

    expect(state3.explicitlyActivatedExtensions.map((ext) => ext.name)).toStrictEqual(['aiSwapper', 'files']);

    const yaml = toYaml(
      serializeUCPConfig(
        {},
        state3.configuration.defined,
        state3.explicitlyActivatedExtensions.reverse(),
        state3.activeExtensions.reverse(),
        {},
      ),
    );

    expect(fromYaml(yaml)).toStrictEqual(
       {
         "active": true,
         "config-full":  {
           "load-order":  [
            {
               "extension": "files",
               "version": "1.1.0",
             },
             {
              "extension": "gmResourceModifier",
              "version": "0.2.0",
            },
             {
              "extension": "textResourceModifier",
              "version": "0.3.0",
            },
             {
              "extension": "aicloader",
              "version": "1.1.0",
            },
             {
              "extension": "aivloader",
              "version": "1.0.0",
            },
             {
              "extension": "aiSwapper",
              "version": "1.1.0",
            },
           ],
           "modules":  {
             "aiSwapper":  {
               "config":  {},
             },
             "aicloader":  {
               "config":  {},
             },
             "aivloader":  {
               "config":  {},
             },
             "files":  {
               "config":  {},
             },
             "gmResourceModifier":  {
               "config":  {},
             },
             "textResourceModifier":  {
               "config":  {},
             },
           },
           "plugins":  {},
         },
         "config-sparse":  {
           "load-order":  [
            {
              "extension": "files",
              "version": "1.1.0",
            },
              {
               "extension": "aiSwapper",
               "version": "1.1.0",
             },

           ],
           "modules":  {
             "aiSwapper":  {
               "config":  {},
             },
             "files":  {
               "config":  {},
             },
           },
           "plugins":  {},
         },
         "meta":  {
           "version": "1.0.0",
         },
       }

    );

    const strategyResultReport = attemptStrategies(
      fromYaml(yaml),
      createBasicExtensionsState(state3.extensions, '1.0.9', '3.0.5'),
      () => {},
    );
    expect(strategyResultReport.result).toBeTruthy();

    if (strategyResultReport.result) {

      expect(strategyResultReport.result.status === "ok").toBe(true);

      if (strategyResultReport.result.status === "ok") {
        const state4 = strategyResultReport.result.newExtensionsState;

        const state5 = addExtensionToExplicityActivatedExtensions(state4, state4.installedExtensions.filter((ext: Extension) => ext.name === 'graphicsApiReplacer').at(0)!);
  
        expect(state5.explicitlyActivatedExtensions.map((ext) => ext.name)).toStrictEqual(['graphicsApiReplacer', 'aiSwapper', 'files']);
    
      }
      
  
    }

    
  })
})