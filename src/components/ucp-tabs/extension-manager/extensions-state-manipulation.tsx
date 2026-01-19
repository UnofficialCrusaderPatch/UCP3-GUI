import './extension-manager.css';

import { SemVer } from 'semver';
import {
  ExtensionDependencyTree,
  ExtensionSolution,
} from '../../../function/extensions/dependency-management/dependency-resolution';
import { ExtensionsState } from '../../../function/extensions/extensions-state';
import { Extension } from '../../../config/ucp/common';

import { showModalOk } from '../../modals/modal-ok';
import Logger, { ConsoleLogger } from '../../../util/scripts/logging';
import { createExtensionID } from '../../../function/global/constants/extension-id';

const LOGGER = new Logger('extension-state.ts');

export class DependencyError extends Error {}

// function setDisplayOrder(
//   ordering: Extension[],
//   extensions: Extension[],
// ): Extension[] {
//   const orderingNames = ordering.map((e) => e.name);
//   // Get the extensions that were not defined in the ordering.
//   const extra = extensions.filter((e) => orderingNames.indexOf(e.name) === -1);
//   return [...extra, ...ordering];
// }

/**
 * This function solves the dependency tree for the given extensions using a copy of the tree
 *
 * @param tree the tree to operate on
 * @param extensions a list of extensions to check
 * @returns the solution of the tree operations
 */
function solveTree(
  tree: ExtensionDependencyTree,
  extensions: Extension[],
): ExtensionSolution {
  const tempTree = tree.copy();

  const tempSolution = tempTree.extensionDependenciesForExtensions(extensions);

  return tempSolution;
}

/**
 * This function checks whether dependencies are actually listed earlier than the respective extension
 * @param activationOrder the extensions in activation order
 * @returns whether the order of extensions is valid
 */
function checkDependencyOrder(activationOrder: Extension[]) {
  // Assume it is valid
  let success = true;
  // Get the display order of extensions
  const displayOrder = activationOrder.slice().reverse();
  displayOrder.forEach((ext, index, arr) => {
    // For each extension check if dependencies are actually listed where they should be
    if (!success) return;

    // All extensions below the displayed one
    const next = arr.slice(index + 1);
    // Their names
    const nextNames = next.map((e) => e.name);
    // For each dependency check if it is not-listed
    const fails = Object.entries(ext.definition.dependencies)
      .filter(([name]) => ['framework', 'frontend'].indexOf(name) === -1)
      .filter(([name]) => {
        return nextNames.indexOf(name) === -1;
      });
    // If not listed, raise an error
    if (fails.length > 0) {
      LOGGER.obj('checkDependencyOrder execution: fail at: ', fails).error();
      success = false;
      const report = fails.map(([name, v]) => `${name} ${v.raw}`).join(', ');
      throw Error(
        `some extensions ${ext.name}@${ext.version} are activated earlier than their dependencies: ${report}`,
      );
    }
  });

  return success;
}

/**
 * This function mimicks a user activating extensions one by one, without setting explicitly active extensions,
 * and including several sanity checks. Throws an error in case of failure.
 *
 * @param extensionsState the current extension state
 * @param activeExtensionsInDisplayOrder the already active extensions in display order
 * @param extensionsToActivateInDisplayOrder the extensions to be activated in display order
 * @returns new extensions state
 */
function mimickStepByStepActivation(
  extensionsState: ExtensionsState,
  activeExtensionsInDisplayOrder: Extension[],
  extensionsToActivateInDisplayOrder: Extension[],
) {
  // try {
  const activeExtensionsInActivateOrder = activeExtensionsInDisplayOrder
    .slice()
    .reverse();

  const extensionsInActivateOrder = extensionsToActivateInDisplayOrder
    .slice()
    .reverse();

  const explicitlyNamedExtensionNames: string[] = [];

  const extensions = [
    ...activeExtensionsInActivateOrder,
    ...extensionsInActivateOrder,
  ];

  extensions.forEach((e) => {
    const definedSet: string[] = [];
    if (
      e.config !== undefined &&
      e.config['config-sparse'] !== undefined &&
      e.config['config-sparse']['load-order'] !== undefined
    ) {
      const oNames = e.config['config-sparse']['load-order'].map(
        ({ extension }) => extension,
      );
      definedSet.push(
        ...oNames.filter(
          (n) => explicitlyNamedExtensionNames.indexOf(n) === -1,
        ),
      );
    }

    const dNames = Object.keys(e.definition.dependencies).filter(
      (n) => ['framework', 'frontend'].indexOf(n) === -1,
    );
    definedSet.push(
      ...dNames.filter(
        (n) =>
          explicitlyNamedExtensionNames.indexOf(n) === -1 &&
          definedSet.indexOf(n) === -1,
      ),
    );

    explicitlyNamedExtensionNames.push(...definedSet);
    explicitlyNamedExtensionNames.push(e.name);
  });

  const activationOrderToCheck = explicitlyNamedExtensionNames.map((n) => {
    const candidates = extensions.filter((e) => e.name === n);
    if (candidates.length === 0) {
      throw Error(n);
    }
    return candidates[0];
  });

  const unnamed = extensions.filter(
    (e) => activationOrderToCheck.indexOf(e) === -1,
  );

  const finalOrder: Extension[] = [...unnamed];
  // let hit = false;
  // extensions.forEach((ext) => {
  //   if (hit) return;
  //   if (explicitlyNamedExtensionNames.indexOf(ext.name) !== -1) {
  //     hit = true;
  //     return;
  //   }
  //   finalOrder.push(ext);
  // });

  if (!checkDependencyOrder(finalOrder)) {
    LOGGER.obj('checkDependencyOrder fail: ', finalOrder).error();
    const report = finalOrder
      .map((ext) => `${ext.definition.name}@${ext.definition.version}`)
      .join(', ');
    throw Error(
      `some extensions are activated earlier than their dependencies:\n${report}`,
    );
  }

  const { tree } = extensionsState;

  ConsoleLogger.debug('generating final order using: ', activationOrderToCheck);
  activationOrderToCheck.forEach((ext) => {
    ConsoleLogger.debug('solveTree', [...finalOrder, ext].slice().reverse());
    const solution = solveTree(tree, [...finalOrder, ext].slice().reverse());
    if (solution.status !== 'OK') {
      throw Error(solution.messages.join('\n'));
    }

    const novel = solution.extensions!.filter(
      (e) => finalOrder.indexOf(e) === -1,
    );

    finalOrder.push(...novel);

    if (!checkDependencyOrder(finalOrder)) {
      LOGGER.obj('checkDependencyOrder fail: ', finalOrder).error();
      const report = finalOrder
        .map((e) => `${e.definition.name} ${e.definition.version}`)
        .join(', ');
      throw Error(
        `some extensions ${ext.name}@${ext.version} are activated earlier than their dependencies: ${report}`,
      );
    }
  });

  return finalOrder;
  // } catch (e) {
  //   console.error(e);
  // }
}

/**
 * This function adds an extension to the list of expliticly activated extensions, activating dependencies.
 *
 * The function aims to retain the version numbers of already activated extensions.
 * If it cannot, a dependency error will be returned.
 *
 * @param extensionsState the current extensions state
 * @param ext the extension to explicitly add
 * @param repair whether to aim to repair the setup or not
 * @returns the new extensions state
 */
function addExtensionToExplicityActivatedExtensions(
  extensionsState: ExtensionsState,
  ext: Extension,
  repair?: boolean,
): ExtensionsState {
  const { tree } = extensionsState;

  const newEAE = [ext, ...extensionsState.explicitlyActivatedExtensions];

  const tempSolution = solveTree(tree, newEAE);

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

  const aeNames = extensionsState.activeExtensions.map(
    (ae: Extension) => ae.name,
  );
  const novelExtensions = solution.extensions.filter(
    (e) => aeNames.indexOf(e.name) === -1,
  );
  const allDependenciesInLoadOrder = mimickStepByStepActivation(
    extensionsState,
    extensionsState.activeExtensions,
    novelExtensions,
  );

  const allDependenciesInDisplayOrder = allDependenciesInLoadOrder
    .slice()
    .reverse();

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

  const finalSolution = tree.extensionDependenciesForExtensions(
    allDependenciesInDisplayOrder,
  );
  if (finalSolution.status !== 'OK' || finalSolution.extensions === undefined) {
    // We should never get here
    LOGGER.msg(solution.message).error();
    throw new DependencyError(`Unexpected error:\n${solution.message}`);
  }

  return {
    ...extensionsState,
    explicitlyActivatedExtensions: eaeInDisplayOrder,
    activeExtensions: allDependenciesInDisplayOrder,
    installedExtensions: installedExtensionsFilteredList,
  };
}

function removeExtensionFromExplicitlyActivatedExtensions(
  extensionsState: ExtensionsState,
  ext: Extension,
): ExtensionsState {
  const { tree } = extensionsState;

  const newEAE = extensionsState.explicitlyActivatedExtensions.filter(
    (e) => e.name !== ext.name,
  );

  const tempTree = tree.copy();

  const tempSolution = tempTree.extensionDependenciesForExtensions(newEAE);

  if (tempSolution.status !== 'OK' || tempSolution.extensions === undefined) {
    LOGGER.msg(tempSolution.message).error();
    throw new DependencyError(tempSolution.message);
  }

  // All needed extensions without ext being active
  const solution = tree.copy().extensionDependenciesForExtensions(newEAE);

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
  // Only one version of each extension can be activated.
  const relevantExtensionNames = new Set(
    stillRelevantExtensions.map((e) => e.name),
  );

  // extensionsState.activeExtensions.filter((e: Extension) => relevantExtensions.has(e));
  const ae = extensionsState.activeExtensions.filter((e) =>
    relevantExtensionNames.has(e.name),
  );

  // Remove ext from the explicitly installed extensions list
  const eae = extensionsState.explicitlyActivatedExtensions.filter(
    (e) => e.name !== ext.name,
  );

  const ie = extensionsState.extensions
    .filter((e: Extension) => !relevantExtensionNames.has(e.name))
    .sort((a: Extension, b: Extension) => a.name.localeCompare(b.name));

  const finalSolution = tree.extensionDependenciesForExtensions(ae);
  if (finalSolution.status !== 'OK' || finalSolution.extensions === undefined) {
    // We should never get here
    LOGGER.msg(solution.message).error();
    throw new DependencyError(`Unexpected error:\n${solution.message}`);
  }

  return {
    ...extensionsState,
    explicitlyActivatedExtensions: eae,
    activeExtensions: ae,
    installedExtensions: ie,
  };
}

/**
 * Removes all explicitly activated extensions one by one from the state
 * @param extensionsState the current state
 * @returns the new state (empty)
 */
function popAllExplicitlyActivatedExtensions(extensionsState: ExtensionsState) {
  let state = extensionsState;
  extensionsState.explicitlyActivatedExtensions.forEach((ext) => {
    state = removeExtensionFromExplicitlyActivatedExtensions(state, ext);
  });
  if (state.activeExtensions.length > 0) {
    const active = state.activeExtensions.map(
      (ext) => `${ext.name}@${ext.version}`,
    );
    throw new Error(`list of extensions not empty after clearing: ${active}`);
  }
  return state;
}

/**
 * Move the extension up or down in the activate extensions list
 * @param extensionsState the current extension state
 * @param event whether to move the extension with the given name up or down
 * @returns the new extension state
 */
function moveExtension(
  extensionsState: ExtensionsState,
  event: { name: string; type: 'up' | 'down' },
) {
  // Name of the extension
  const { name, type } = event;

  // Copy of the active extensions list
  const ae = [...extensionsState.activeExtensions];

  // The current position of the extension in the active extensions list
  const aei = ae.map((e) => e.name).indexOf(name);

  // The active extension itself
  const element = ae[aei];

  // New index defined based on event
  let newIndex = type === 'up' ? aei - 1 : aei + 1;
  newIndex = newIndex < 0 ? 0 : newIndex;
  newIndex = newIndex > ae.length - 1 ? ae.length - 1 : newIndex;

  // Remove the extension from the active extensions list
  ae.splice(aei, 1);
  // Insert the element back in at the right place
  ae.splice(newIndex, 0, element);

  // The names of explicitly active extensions
  const eaeNames = extensionsState.explicitlyActivatedExtensions.map(
    (extension) => extension.name,
  );
  // Redefine the list of explicitly active extensions based on the new order
  const eae = ae.filter((extension) => eaeNames.indexOf(extension.name) !== -1);

  return {
    ...extensionsState,
    activeExtensions: ae,
    explicitlyActivatedExtensions: eae,
  } as ExtensionsState;
}

function upgradeAllExtensions(extensionsState: ExtensionsState) {
  const extensionNamesInLoadOrder =
    extensionsState.explicitlyActivatedExtensions
      .slice()
      .reverse()
      .map((ext) => ext.name);
  let newState = popAllExplicitlyActivatedExtensions(extensionsState);

  const highestExtensions = extensionNamesInLoadOrder.map(
    (n) =>
      extensionsState.extensions
        .filter((ext) => ext.name === n)
        .sort((a, b) => new SemVer(b.version).compare(a.version))[0]!, // We can be sure it exists
  );

  highestExtensions.forEach((ext) => {
    newState = addExtensionToExplicityActivatedExtensions(newState, ext);
  });

  return newState;
}

export {
  addExtensionToExplicityActivatedExtensions,
  removeExtensionFromExplicitlyActivatedExtensions,
  moveExtension,
  popAllExplicitlyActivatedExtensions,
  upgradeAllExtensions,
};
