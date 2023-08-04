import { Extension } from 'config/ucp/common';
import ExtensionDependencySolver from 'config/ucp/extension-dependency-solver';
import { ExtensionsState } from 'function/global/types';

import './extension-manager.css';
import { info } from 'util/scripts/logging';

const addExtensionToExplicityActivatedExtensions = (
  extensionsState: ExtensionsState,
  eds: ExtensionDependencySolver,
  extensionsByName: { [k: string]: Extension },
  extensionsByNameVersionString: { [k: string]: Extension },
  ext: Extension
) => {
  // TODO: include a check where it checks whether the right version of an extension is available and selected (version dropdown box)

  const dependencyExtensionNames = eds.dependenciesFor(ext.name).flat();

  const dependencies: Extension[] = dependencyExtensionNames
    .filter(
      (v: string) =>
        extensionsState.activeExtensions
          .map((e: Extension) => e.name)
          .indexOf(v) === -1
    )
    .map((v: string) => {
      if (extensionsByName[v] !== undefined) {
        return extensionsByName[v];
      }
      throw new Error();
    }) //           .filter((e: Extension) => dependencyExtensionNames.indexOf(e.name) !== -1)
    .reverse();

  const remainder = extensionsState.activeExtensions
    .flat()
    .map((e: Extension) => `${e.name}-${e.version}`)
    .filter(
      (es) =>
        dependencies
          .map((e: Extension) => `${e.name}-${e.version}`)
          .indexOf(es) === -1
    )
    .map((es: string) => extensionsByNameVersionString[es]);

  const final = [...dependencies, ...remainder];

  const localEDS = new ExtensionDependencySolver(final);
  info(localEDS.solve());

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
  eds: ExtensionDependencySolver,
  extensions: Extension[],
  ext: Extension
) => {
  const relevantExtensions = new Set(
    extensionsState.explicitlyActivatedExtensions
      .filter((e) => `${e.name}-${e.version}` !== `${ext.name}-${ext.version}`)
      .map((e: Extension) => eds.dependenciesFor(e.name).flat())
      .flat()
  );

  // extensionsState.activeExtensions.filter((e: Extension) => relevantExtensions.has(e));
  const ae = extensionsState.activeExtensions.filter((e) =>
    relevantExtensions.has(e.name)
  );

  return {
    ...extensionsState,
    extensions: extensionsState.extensions,
    explicitlyActivatedExtensions:
      extensionsState.explicitlyActivatedExtensions.filter(
        (e) => `${e.name}-${e.version}` !== `${ext.name}-${ext.version}`
      ),
    activeExtensions: ae,
    installedExtensions: extensions
      .filter((e: Extension) => !relevantExtensions.has(e.name))
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
