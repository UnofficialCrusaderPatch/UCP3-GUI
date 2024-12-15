import { describe, expect, test } from "vitest";

import STATE from './extensions-state.json'
import { ExtensionsState } from "../../../../function/extensions/extensions-state";
import { buildExtensionConfigurationDB } from "../extension-configuration";
import { deserializeSimplifiedSerializedExtensionsStateFromExtensions } from "../../../../testing/dump-extensions-state";
import { addExtensionToExplicityActivatedExtensions } from "../extensions-state-manipulation";

function state(): ExtensionsState {
  return deserializeSimplifiedSerializedExtensionsStateFromExtensions(JSON.parse(JSON.stringify(STATE.extensions)));
}

describe('state loading', () => {
  test('basic state information', () => {
    let s = state();

    expect(s.activeExtensions.length).toBe(0);

    s = addExtensionToExplicityActivatedExtensions(s, s.extensions.filter((ext) => ext.name === "B").at(0)!, false);

    expect(s.activeExtensions.length).toBe(2);

    s = addExtensionToExplicityActivatedExtensions(s, s.extensions.filter((ext) => ext.name === "C").at(0)!, false);

    expect(s.activeExtensions.length).toBe(3);
  })
})

describe('later required values override previous values', () => {
  test('value override works', () => {
    let s = state();
    s = addExtensionToExplicityActivatedExtensions(s, s.extensions.filter((ext) => ext.name === "C").at(0)!, false);
    
    s = buildExtensionConfigurationDB(s);
    expect(s.configuration.defined['A.feature']).toBe(true);
    
    s = addExtensionToExplicityActivatedExtensions(s, s.extensions.filter((ext) => ext.name === "B").at(0)!, false);
    s = buildExtensionConfigurationDB(s);
    
    expect(s.configuration.defined['A.feature']).toBe(false);
  })
})

describe('bug: required not overriding', () => {
  test('bug arises', () => {
    let s = state();
    s = addExtensionToExplicityActivatedExtensions(s, s.extensions.filter((ext) => ext.name === "B").at(0)!, false);
    
    s = buildExtensionConfigurationDB(s);
    expect(s.configuration.defined['A.feature']).toBe(false);
    
    s = addExtensionToExplicityActivatedExtensions(s, s.extensions.filter((ext) => ext.name === "C").at(0)!, false);
    s = buildExtensionConfigurationDB(s);

    expect(s.configuration.defined['A.feature']).toBe(false);
  })
})