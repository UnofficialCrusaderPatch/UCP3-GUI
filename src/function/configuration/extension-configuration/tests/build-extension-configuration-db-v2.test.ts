import { describe, expect, test } from "vitest";

import STATE from './extensions-state.json'
import { ExtensionsState } from "../../../extensions/extensions-state";
import { buildExtensionConfigurationDB } from "../build-extension-configuration-db";
import { buildExtensionConfigurationDB as v2 } from "../build-extension-configuration-db-v2";
import { deserializeSimplifiedSerializedExtensionsStateFromExtensions } from "../../../../testing/dump-extensions-state";
import { addExtensionToExplicityActivatedExtensions } from "../../../../components/ucp-tabs/extension-manager/extensions-state-manipulation";

function state(): ExtensionsState {
  return deserializeSimplifiedSerializedExtensionsStateFromExtensions(JSON.parse(JSON.stringify(STATE.extensions)));
}

describe('state loading', () => {
  test('comparison', () => {
    let s = state();

    s = addExtensionToExplicityActivatedExtensions(s, s.extensions.filter((ext) => ext.name === "B").at(0)!, false);



    s = addExtensionToExplicityActivatedExtensions(s, s.extensions.filter((ext) => ext.name === "C").at(0)!, false);

    s = buildExtensionConfigurationDB(s);

    const s2 = v2(s);

    expect(s.configuration).toStrictEqual(s2.configuration);
  })
})
