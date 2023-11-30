import { Extension } from 'config/ucp/common';
import { ExtensionsState } from 'function/global/types';

import './extension-manager.css';
import { showGeneralModalOk } from 'components/modals/ModalOk';
import Logger from 'util/scripts/logging';
import { createReceivePluginPathsFunction } from 'components/sandbox-menu/sandbox-menu-functions';
import { getStore } from 'hooks/jotai/base';
import { GAME_FOLDER_ATOM } from 'function/global/global-atoms';

const LOGGER = new Logger('extension-state.ts');

const addExtensionToExplicityActivatedExtensions = async (
  extensionsState: ExtensionsState,
  ext: Extension,
) => {
  const { tree } = extensionsState;

  const newEAE = [...extensionsState.explicitlyActivatedExtensions, ext];

  const solution = tree.dependenciesForExtensions(newEAE);

  if (solution.status !== 'OK' || solution.extensions === undefined) {
    LOGGER.msg(solution.message).error();
    await showGeneralModalOk({
      message: solution.message,
      title: 'Error in dependencies',
    });

    return extensionsState;
  }

  const allDependenciesInLoadOrder = solution.extensions.reverse();

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

  // All needed extensions without ext being active
  const solution = tree.dependenciesForExtensions(
    extensionsState.explicitlyActivatedExtensions.filter((e) => e !== ext),
  );

  if (solution.status !== 'OK' || solution.extensions === undefined) {
    LOGGER.msg(solution.message).error();
    await showGeneralModalOk({
      message: solution.message,
      title: 'Error in dependencies',
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
