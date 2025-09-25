import './extension-manager.css';

import { ExtensionsState } from '../../../function/extensions/extensions-state';
import { Extension } from '../../../config/ucp/common';

import { showModalOk } from '../../modals/modal-ok';
import Logger from '../../../util/scripts/logging';
import { createExtensionID } from '../../../function/global/constants/extension-id';

const LOGGER = new Logger('extension-state.ts');

export class DependencyError extends Error {}

function setDisplayOrder(
  ordering: Extension[],
  extensions: Extension[],
): Extension[] {
  const orderingNames = ordering.map((e) => e.name);
  // Get the extensions that were not defined in the ordering.
  const extra = extensions.filter((e) => orderingNames.indexOf(e.name) === -1);
  return [...extra, ...ordering];
}

function addExtensionToExplicityActivatedExtensions(
  extensionsState: ExtensionsState,
  ext: Extension,
  repair?: boolean,
): ExtensionsState {
  const { tree } = extensionsState;

  const newEAE = [ext, ...extensionsState.explicitlyActivatedExtensions];

  const tempTree = tree.copy();

  const tempSolution = tempTree.extensionDependenciesForExtensions(newEAE);

  if (tempSolution.status !== 'OK' || tempSolution.extensions === undefined) {
    LOGGER.msg(tempSolution.message).error();
    throw new DependencyError(tempSolution.message);
  }

  const solution = tree.extensionDependenciesForExtensions(newEAE);
  if (solution.status !== 'OK' || solution.extensions === undefined) {
    // We should never get here
    LOGGER.msg(solution.message).error();
    throw new DependencyError(solution.message);
  }

  // Yoink ext to the top in extensions state here!
  // const allDependenciesInLoadOrder = [
  //   ext,
  //   ...solution.extensions.filter((e) => e !== ext).reverse(),
  // ];
  const allDependenciesInDisplayOrder = setDisplayOrder(
    extensionsState.activeExtensions,
    solution.extensions.slice().reverse(), // toReversed is not available on Win < 10
  );

  // Filter out extensions with a different version than those that are now going to be activated
  const depNames = new Set(allDependenciesInDisplayOrder.map((e) => e.name));
  const installedExtensionsFilteredList =
    extensionsState.installedExtensions.filter((e) => !depNames.has(e.name));

  const eaeInDisplayOrder = allDependenciesInDisplayOrder.filter(
    (ae) => newEAE.indexOf(ae) !== -1,
  );

  const misordered = newEAE.filter(
    (e, index) => eaeInDisplayOrder.indexOf(e) !== index,
  );
  if (misordered.length > 0) {
    if (repair === true) {
      LOGGER.msg(
        `repairing invalid sparse extension order: ${misordered.map((e) => createExtensionID(e))}`,
      ).error();
    } else {
      const err = `sparse extension order is invalid: ${misordered.map((e) => createExtensionID(e))}`;
      LOGGER.msg(err).error();
      throw new DependencyError(err);
    }
  }

  return {
    ...extensionsState,
    explicitlyActivatedExtensions: eaeInDisplayOrder,
    activeExtensions: allDependenciesInDisplayOrder,
    installedExtensions: installedExtensionsFilteredList,
  };
}

async function removeExtensionFromExplicitlyActivatedExtensions(
  extensionsState: ExtensionsState,
  ext: Extension,
): Promise<ExtensionsState> {
  const { tree } = extensionsState;

  const newEAE = extensionsState.explicitlyActivatedExtensions.filter(
    (e) => e !== ext,
  );

  const tempTree = tree.copy();

  const tempSolution = tempTree.extensionDependenciesForExtensions(newEAE);

  if (tempSolution.status !== 'OK' || tempSolution.extensions === undefined) {
    LOGGER.msg(tempSolution.message).error();
    throw new DependencyError(tempSolution.message);
  }

  // All needed extensions without ext being active
  const solution = tree.extensionDependenciesForExtensions(newEAE);

  if (solution.status !== 'OK' || solution.extensions === undefined) {
    LOGGER.msg(solution.message).error();
    showModalOk({
      message: {
        key: 'error.reason',
        args: {
          reason: solution.message,
        },
      },
      title: 'extensions.deactivate.dependencies.error.title',
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
  };
}

function moveExtension(
  extensionsState: ExtensionsState,
  event: { name: string; type: 'up' | 'down' },
) {
  const { name, type } = event;

  const ae = [...extensionsState.activeExtensions];
  const aei = ae.map((e) => e.name).indexOf(name);
  const element = ae[aei];
  let newIndex = type === 'up' ? aei - 1 : aei + 1;
  newIndex = newIndex < 0 ? 0 : newIndex;
  newIndex = newIndex > ae.length - 1 ? ae.length - 1 : newIndex;
  ae.splice(aei, 1);
  ae.splice(newIndex, 0, element);

  const eaeNames = extensionsState.explicitlyActivatedExtensions.map(
    (extension) => extension.name,
  );
  const eae = ae.filter((extension) => eaeNames.indexOf(extension.name) !== -1);

  return {
    ...extensionsState,
    activeExtensions: ae,
    explicitlyActivatedExtensions: eae,
  } as ExtensionsState;
}

export {
  addExtensionToExplicityActivatedExtensions,
  removeExtensionFromExplicitlyActivatedExtensions,
  moveExtension,
};
