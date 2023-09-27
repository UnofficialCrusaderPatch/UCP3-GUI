import { Extension } from 'config/ucp/common';
import { ExtensionsState } from 'function/global/types';

import './extension-manager.css';
import { info } from 'util/scripts/logging';

const addExtensionToExplicityActivatedExtensions = (
  extensionsState: ExtensionsState,
  ext: Extension
) => {
  // TODO: include a check where it checks whether the right version of an extension is available and selected (version dropdown box)

  const { tree } = extensionsState;

  // TODO: alternative: tree.dependenciesFor([ext, extensionsState.explicitlyActivatedExtensions])

  const final = tree
    .dependenciesForExtensions([
      ext,
      ...extensionsState.explicitlyActivatedExtensions,
    ])
    .reverse();

  // // This version exists to preserve custom ordering applied by the user
  // const dependenciesSorted = tree.dependenciesFor(ext);

  // const dependencies: Extension[] = dependenciesSorted
  //   .filter(
  //     (v: Extension) => extensionsState.activeExtensions.indexOf(v) === -1
  //   )
  //   .reverse();

  // const remainder = extensionsState.activeExtensions
  //   .flat()
  //   .filter((e) => dependencies.indexOf(e) === -1);

  // const final = [...dependencies, ...remainder];

  return {
    ...extensionsState,
    explicitlyActivatedExtensions: [
      ...extensionsState.explicitlyActivatedExtensions,
      ext,
    ],
    activeExtensions: final,
    installedExtensions: extensionsState.installedExtensions.filter(
      (e: Extension) =>
        final
          .map((ex: Extension) => `${ex.name}-${ex.version}`)
          .indexOf(`${e.name}-${e.version}`) === -1
    ),
  };
};

const removeExtensionFromExplicitlyActivatedExtensions = (
  extensionsState: ExtensionsState,
  ext: Extension
) => {
  const { tree } = extensionsState;

  const relevantExtensions = tree.dependenciesForExtensions(
    extensionsState.explicitlyActivatedExtensions
  );

  // Only one version of each extension can be activated.
  const relevantExtensionNames = new Set(relevantExtensions.map((e) => e.name));

  // extensionsState.activeExtensions.filter((e: Extension) => relevantExtensions.has(e));
  const ae = extensionsState.activeExtensions.filter(
    (e) => relevantExtensions.indexOf(e) !== -1
  );

  return {
    ...extensionsState,
    extensions: extensionsState.extensions,
    explicitlyActivatedExtensions:
      extensionsState.explicitlyActivatedExtensions.filter(
        (e) => `${e.name}-${e.version}` !== `${ext.name}-${ext.version}`
      ),
    activeExtensions: ae,
    installedExtensions: extensionsState.extensions
      .filter((e: Extension) => !relevantExtensionNames.has(e.name))
      .sort((a: Extension, b: Extension) => a.name.localeCompare(b.name)),
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
