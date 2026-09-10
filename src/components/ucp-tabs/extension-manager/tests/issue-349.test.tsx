/* eslint-disable no-param-reassign */
import { Extension } from "config/ucp/common";
import { ExtensionsState } from "function/extensions/extensions-state";
import { describe, expect, test } from "vitest";
import { Range } from "semver";
import { ExtensionDependencyTree } from "function/extensions/dependency-management/dependency-resolution";
import { addExtensionToExplicityActivatedExtensions } from "../extensions-state-manipulation";

import STATE from './issue-349-data.json'
import STATE_WINPROCHANDLER_UPGRADE from './issue-349-data-winprochandler-upgrade.json'


/** Apply this in the browser window console, and then JSON.stringify() */
// const cleanExtensionsState = (state: ExtensionsState) => {

//   const cleanExtension = (ext: Extension) => {
//     ext.ui=undefined; 
//     ext.config = undefined; 
//     ext.configEntries = undefined; 
//     ext.io = undefined; 
//     ext.locales = undefined; 
//     Object.entries(ext.definition.dependencies).forEach((e) => {
//       if (e[1] !== undefined && typeof(e[1]) !== 'string') {
//         ext.definition.dependencies[e[0]] = e[1].raw;
//       }
//     })
//   }
//   state.tree = undefined;
//   state.extensions.forEach((ext) => cleanExtension(ext));
//   state.activeExtensions = state.activeExtensions.map((ext) => `${ext.name}@${ext.version}`);
//   state.installedExtensions = state.installedExtensions.map((ext) => `${ext.name}@${ext.version}`);
//   state.explicitlyActivatedExtensions = state.explicitlyActivatedExtensions.map((ext) => `${ext.name}@${ext.version}`);
// }

const deserialize = (state: unknown) => {
  const state2 = JSON.parse(JSON.stringify(state));
  state2.extensions.forEach((ext: Extension) => {
    Object.entries(ext.definition.dependencies).forEach((e) => {
      ext.definition.dependencies[e[0]] = new Range(e[1]);
    })
  })
  const lookup = (id: string) => state2.extensions.filter((ext: Extension) => `${ext.name}@${ext.version}` === id)[0];
  state2.activeExtensions = state2.activeExtensions.map((id: string) => lookup(id))
  state2.installedExtensions = state2.installedExtensions.map((id: string) => lookup(id))
  state2.explicitlyActivatedExtensions = state2.explicitlyActivatedExtensions.map((id: string) => lookup(id))

  state2.tree = new ExtensionDependencyTree(state2.extensions as Extension[], '1.0.14', '3.0.7');

  return state2 as unknown as ExtensionsState;
}

describe('solution to issue 349', () => {
  test('whether adding LOTO works', () => {
    // const TEST_STORE = createStore();

    const state1 = deserialize(STATE);
    expect(state1.activeExtensions.map((ext) => `${ext.name}@${ext.version}`)).toEqual([
      "graphicsApiReplacer@1.3.0",
      "winProcHandler@0.2.0",
      "ucp2-legacy-defaults@2.15.1",
      "ucp2-vanilla-fixed-aiv@2.15.1",
      "ucp2-aic-patch@2.15.1",
      "ucp2-ai-files@2.15.1",
      "aiSwapper@1.1.0",
      "aivloader@1.0.0",
      "files@1.3.0",
      "aicloader@1.1.2",
      "textResourceModifier@0.3.0",
      "gmResourceModifier@0.2.0",
      "ucp2-legacy@2.15.1",
    ]);
    
    const target = state1.installedExtensions.filter((ext: Extension) => ext.name === 'Legends-Of-The-Orient').at(0)!;
    const state2 = addExtensionToExplicityActivatedExtensions(state1, target);

    expect(state2.activeExtensions.map((ext) => `${ext.name}@${ext.version}`)).toEqual([
      "Legends-Of-The-Orient@3.1.5",
      "maploader@1.1.0",
      "startResources@1.0.1",
      "Legends-Of-The-Orient-AI@3.1.5",
      "running-units@1.0.2",
      "custom-skirmish-trails@1.2.5",
      "ai-ox-tethers@1.0.3",
      "graphicsApiReplacer@1.3.0",
      "winProcHandler@0.2.0",
      "ucp2-legacy-defaults@2.15.1",
      "ucp2-vanilla-fixed-aiv@2.15.1",
      "ucp2-aic-patch@2.15.1",
      "ucp2-ai-files@2.15.1",
      "aiSwapper@1.1.0",
      "aivloader@1.0.0",
      "files@1.3.0",
      "aicloader@1.1.2",
      "textResourceModifier@0.3.0",
      "gmResourceModifier@0.2.0",
      "ucp2-legacy@2.15.1",
    ]);
  })

});


describe('invalid case without user invention', () => {
  test('adding aiSwapper should break', () => {
    // const TEST_STORE = createStore();

    const state1 = deserialize(STATE_WINPROCHANDLER_UPGRADE);
    expect(state1.activeExtensions.map((ext) => `${ext.name}@${ext.version}`)).toEqual([
      "graphicsApiReplacer@1.3.0",
      "winProcHandler@0.2.0",
      "ucp2-legacy-defaults@2.15.1",
      "ucp2-vanilla-fixed-aiv@2.15.1",
      "ucp2-aic-patch@2.15.1",
      "ucp2-ai-files@2.15.1",
      "aiSwapper@1.1.0",
      "aivloader@1.0.0",
      "files@1.3.0",
      "aicloader@1.1.2",
      "textResourceModifier@0.3.0",
      "gmResourceModifier@0.2.0",
      "ucp2-legacy@2.15.1",
    ]);
    
    const target = state1.installedExtensions.filter((ext: Extension) => ext.name === 'Legends-Of-The-Orient').at(0)!;
    
    expect(() => addExtensionToExplicityActivatedExtensions(state1, target)).toThrow();

  })

});