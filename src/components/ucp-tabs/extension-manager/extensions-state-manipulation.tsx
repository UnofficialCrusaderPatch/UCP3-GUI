import './extension-manager.css';

import { ExtensionDependencyTree } from '../../../function/extensions/dependency-management/dependency-resolution';
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

function checkTree(
  tree: ExtensionDependencyTree,
  extensionsInReverseOrder: Extension[],
) {
  const tempTree = tree.copy();

  const tempSolution = tempTree.extensionDependenciesForExtensions(
    extensionsInReverseOrder,
  );

  return tempSolution;
}

function checkOrder(activationOrder: Extension[]) {
  let success = true;
  const displayOrder = activationOrder.slice().reverse();
  displayOrder.forEach((ext, index, arr) => {
    if (!success) return;

    const next = arr.slice(index + 1);
    const nextNames = next.map((e) => e.name);
    const fails = Object.entries(ext.definition.dependencies)
      .filter(([name]) => ['framework', 'frontend'].indexOf(name) === -1)
      .filter(([name]) => {
        return nextNames.indexOf(name) === -1;
      });
    if (fails.length > 0) {
      LOGGER.obj('checkOrder execution: fail at: ', fails).error();
      success = false;
    }
  });

  return success;
}

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

  if (!checkOrder(finalOrder)) {
    LOGGER.obj('checkOrder fail: ', finalOrder).error();
    throw Error();
  }

  const { tree } = extensionsState;

  ConsoleLogger.debug('generating final order using: ', activationOrderToCheck);
  activationOrderToCheck.forEach((ext) => {
    ConsoleLogger.debug('checkTree', [...finalOrder, ext].slice().reverse());
    const solution = checkTree(tree, [...finalOrder, ext].slice().reverse());
    if (solution.status !== 'OK') {
      throw Error();
    }

    const novel = solution.extensions!.filter(
      (e) => finalOrder.indexOf(e) === -1,
    );

    finalOrder.push(...novel);

    if (!checkOrder(finalOrder)) {
      LOGGER.obj('checkOrder fail: ', finalOrder).error();
      throw Error();
    }
  });

  return finalOrder;
  // } catch (e) {
  //   console.error(e);
  // }
}

function addExtensionToExplicityActivatedExtensions(
  extensionsState: ExtensionsState,
  ext: Extension,
  repair?: boolean,
): ExtensionsState {
  const { tree } = extensionsState;

  const newEAE = [ext, ...extensionsState.explicitlyActivatedExtensions];

  const tempSolution = checkTree(tree, newEAE);

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
  const allDependenciesInLoadOrder = mimickStepByStepActivation(
    extensionsState,
    extensionsState.activeExtensions,
    solution.extensions.filter(
      (e) => extensionsState.activeExtensions.indexOf(e) === -1,
    ),
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
