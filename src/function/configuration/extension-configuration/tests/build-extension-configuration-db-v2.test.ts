import { describe, expect, test } from "vitest";

import EXTENSIONS from './extensions-state.json'
import { ExtensionsState } from "../../../extensions/extensions-state";
import { buildExtensionConfigurationDB } from "../build-extension-configuration-db";
import { buildExtensionConfigurationDB as v2 } from "../build-extension-configuration-db-v2";
import { deserializeSimplifiedSerializedExtensionsStateFromExtensions } from "../../../../testing/dump-extensions-state";
import { addExtensionToExplicityActivatedExtensions } from "../../../../components/ucp-tabs/extension-manager/extensions-state-manipulation";

function state(): ExtensionsState {
  return deserializeSimplifiedSerializedExtensionsStateFromExtensions(JSON.parse(JSON.stringify(EXTENSIONS)));
}

describe('compare new version configuration building', () => {
  test('B, C', () => {
    let s = state();

    s = addExtensionToExplicityActivatedExtensions(s, s.extensions.filter((ext) => ext.name === "B").at(0)!, false);



    s = addExtensionToExplicityActivatedExtensions(s, s.extensions.filter((ext) => ext.name === "C").at(0)!, false);

    s = buildExtensionConfigurationDB(s);

    const s2 = v2(s);

    expect(s.configuration.defined).toStrictEqual(s2.configuration.defined);
    expect(s.configuration.errors).toStrictEqual(s2.configuration.errors);
    expect(s.configuration.locks).toStrictEqual(s2.configuration.locks);
    expect(Array.from(s.configuration.overrides.keys()).sort()).toStrictEqual(Array.from(s2.configuration.overrides.keys()).sort());
    expect(s.configuration.overrides).toStrictEqual(s2.configuration.overrides);
    expect(s.configuration.state).toStrictEqual(s2.configuration.state);
    expect(s.configuration.statusCode).toStrictEqual(s2.configuration.statusCode);
    expect(s.configuration.suggestions).toStrictEqual(s2.configuration.suggestions);
    expect(s.configuration.warnings).toStrictEqual(s2.configuration.warnings);
  })

  test('C, B', () => {
    let s = state();

    s = addExtensionToExplicityActivatedExtensions(s, s.extensions.filter((ext) => ext.name === "C").at(0)!, false);



    s = addExtensionToExplicityActivatedExtensions(s, s.extensions.filter((ext) => ext.name === "B").at(0)!, false);

    s = buildExtensionConfigurationDB(s);

    const s2 = v2(s);

    expect(s.configuration.defined).toStrictEqual(s2.configuration.defined);
    expect(s.configuration.errors).toStrictEqual(s2.configuration.errors);
    expect(s.configuration.locks).toStrictEqual(s2.configuration.locks);
    expect(Array.from(s.configuration.overrides.keys()).sort()).toStrictEqual(Array.from(s2.configuration.overrides.keys()).sort());
    expect(s.configuration.overrides).toStrictEqual(s2.configuration.overrides);
    
    expect(s.configuration.state).toStrictEqual(s2.configuration.state);
    expect(s.configuration.statusCode).toStrictEqual(s2.configuration.statusCode);
    expect(s.configuration.suggestions).toStrictEqual(s2.configuration.suggestions);
    expect(s.configuration.warnings).toStrictEqual(s2.configuration.warnings);
  })
})
