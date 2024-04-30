import './extension-manager.css';

import { ExtensionsState } from '../../../function/extensions/extensions-state';
import { Extension } from '../../../config/ucp/common';

import { showModalOk } from '../../modals/modal-ok';
import Logger from '../../../util/scripts/logging';

const LOGGER = new Logger('extension-state.ts');

export class DependencyError extends Error {}

const addExtensionToExplicityActivatedExtensions = (
  extensionsState: ExtensionsState,
  ext: Extension,
) => {
  const { tree } = extensionsState;

  const newEAE = [...extensionsState.explicitlyActivatedExtensions, ext];

  const tempTree = tree.copy();

  const tempSolution = tempTree.dependenciesForExtensions(newEAE);

  if (tempSolution.status !== 'OK' || tempSolution.extensions === undefined) {
    LOGGER.msg(tempSolution.message).error();
    throw new DependencyError(tempSolution.message);
  }

  const solution = tree.dependenciesForExtensions(newEAE);
  if (solution.status !== 'OK' || solution.extensions === undefined) {
    // We should never get here
    LOGGER.msg(solution.message).error();
    throw new DependencyError(solution.message);
  }

  const allDependenciesInLoadOrder = [
    ext,
    ...solution.extensions.filter((e) => e !== ext).reverse(),
  ];

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

const removeExtensionFromExplicitlyActivatedExtensions = async (
  extensionsState: ExtensionsState,
  ext: Extension,
) => {
  const { tree } = extensionsState;

  const newEAE = extensionsState.explicitlyActivatedExtensions.filter(
    (e) => e !== ext,
  );

  const tempTree = tree.copy();

  const tempSolution = tempTree.dependenciesForExtensions(newEAE);

  if (tempSolution.status !== 'OK' || tempSolution.extensions === undefined) {
    LOGGER.msg(tempSolution.message).error();
    throw new DependencyError(tempSolution.message);
  }

  // All needed extensions without ext being active
  const solution = tree.dependenciesForExtensions(newEAE);

  if (solution.status !== 'OK' || solution.extensions === undefined) {
    LOGGER.msg(solution.message).error();
    await showModalOk({
      message: solution.message,
      title: 'Deactivating extension: Error in dependencies',
    });

    return extensionsState;
  }

  const stillRelevantExtensions = solution.extensions;

  // extensionsState.activeExtensions.filter((e: Extension) => relevantExtensions.has(e));
  const ae = extensionsState.activeExtensions.filter(
    (e) => stillRelevantExtensions.indexOf(e) !== -1,
  );

  // Remove ext from the explicitly installed extensions list
  const eae = extensionsState.explicitlyActivatedExtensions.filter(
    (e) => e !== ext,
  );

  // Only one version of each extension can be activated.
  const relevantExtensionNames = new Set(
    stillRelevantExtensions.map((e) => e.name),
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
  event: { name: string; type: 'up' | 'down' },
) => {
  const { name, type } = event;

  const ae = [...extensionsState.activeExtensions];
  const aei = ae.map((e) => e.name).indexOf(name);
  const element = ae[aei];
  let newIndex = type === 'up' ? aei - 1 : aei + 1;
  newIndex = newIndex < 0 ? 0 : newIndex;
  newIndex = newIndex > ae.length - 1 ? ae.length - 1 : newIndex;
  ae.splice(aei, 1);
  ae.splice(newIndex, 0, element);

  return {
    ...extensionsState,
    activeExtensions: ae,
  } as ExtensionsState;
};

export {
  addExtensionToExplicityActivatedExtensions,
  removeExtensionFromExplicitlyActivatedExtensions,
  moveExtension,
};
