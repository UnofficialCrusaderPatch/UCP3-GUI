import { Extension } from 'config/ucp/common';
import { ExtensionsState } from 'function/global/types';

import './extension-manager.css';
import { info } from 'util/scripts/logging';

const addExtensionToExplicityActivatedExtensions = (
  extensionsState: ExtensionsState,
  ext: Extension
) => {
  const { tree } = extensionsState;

  const newEAE = [...extensionsState.explicitlyActivatedExtensions, ext];

  const allDependenciesInLoadOrder = tree
    .dependenciesForExtensions(newEAE)
    .reverse();

  // Filter out extensions with a different version than those that are now going to be activated
  const depNames = new Set(allDependenciesInLoadOrder.map((e) => e.name));
  const installedExtensionsFilteredList =
    extensionsState.installedExtensions.filter((e) => !depNames.has(e.name));

  return {
    ...extensionsState,
    explicitlyActivatedExtensions: newEAE,
    activeExtensions: allDependenciesInLoadOrder,
    installedExtensions: installedExtensionsFilteredList,
  };
};

const removeExtensionFromExplicitlyActivatedExtensions = (
  extensionsState: ExtensionsState,
  ext: Extension
) => {
  const { tree } = extensionsState;

  // All needed extensions without ext being active
  const stillRelevantExtensions = tree.dependenciesForExtensions(
    extensionsState.explicitlyActivatedExtensions.filter((e) => e !== ext)
  );

  // extensionsState.activeExtensions.filter((e: Extension) => relevantExtensions.has(e));
  const ae = extensionsState.activeExtensions.filter(
    (e) => stillRelevantExtensions.indexOf(e) !== -1
  );

  // Remove ext from the explicitly installed extensions list
  const eae = extensionsState.explicitlyActivatedExtensions.filter(
    (e) => e !== ext
  );

  // Only one version of each extension can be activated.
  const relevantExtensionNames = new Set(
    stillRelevantExtensions.map((e) => e.name)
  );
  const ie = extensionsState.extensions
    .filter((e: Extension) => !relevantExtensionNames.has(e.name))
    .sort((a: Extension, b: Extension) => a.name.localeCompare(b.name));

  return {
    ...extensionsState,
    extensions: extensionsState.extensions,
    explicitlyActivatedExtensions: eae,
    activeExtensions: ae,
    installedExtensions: ie,
  } as ExtensionsState;
};

const moveExtension = (
  extensionsState: ExtensionsState,
  event: { name: string; type: 'up' | 'down' }
) => {
  const { name, type } = event;
  const aei = extensionsState.activeExtensions.map((e) => e.name).indexOf(name);
  const element = extensionsState.activeExtensions[aei];
  let newIndex = type === 'up' ? aei - 1 : aei + 1;
  newIndex = newIndex < 0 ? 0 : newIndex;
  newIndex =
    newIndex > extensionsState.activeExtensions.length - 1
      ? extensionsState.activeExtensions.length - 1
      : newIndex;
  extensionsState.activeExtensions.splice(aei, 1);
  extensionsState.activeExtensions.splice(newIndex, 0, element);

  return {
    ...extensionsState,
    activeExtensions: extensionsState.activeExtensions,
  } as ExtensionsState;
};

export {
  addExtensionToExplicityActivatedExtensions,
  removeExtensionFromExplicitlyActivatedExtensions,
  moveExtension,
};
