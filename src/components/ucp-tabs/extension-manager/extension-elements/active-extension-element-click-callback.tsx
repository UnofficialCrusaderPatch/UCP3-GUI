import { Extension } from '../../../../config/ucp/common';
import { ExtensionsState } from '../../../../function/extensions/extensions-state';
import { createExtensionID } from '../../../../function/global/constants/extension-id';
import { getStore } from '../../../../hooks/jotai/base';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
  ConfigurationQualifier,
} from '../../../../function/configuration/state';
import Logger, { ConsoleLogger } from '../../../../util/scripts/logging';
import {
  EXTENSION_STATE_INTERFACE_ATOM,
  EXTENSION_STATE_REDUCER_ATOM,
} from '../../../../function/extensions/state/state';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';
import { removeExtensionFromExplicitlyActivatedExtensions } from '../extensions-state-manipulation';
import { buildExtensionConfigurationDB } from '../../../../function/configuration/extension-configuration/build-extension-configuration-db';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from '../../common/buttons/config-serialized-state';
import { filterOutExtensions as filterExtensions } from './filter-out-extensions';
import reportAndConfirmBuildResult from './reporting';
import { removeProviderAiOverrides } from './remove-provider-ai-overrides';
import { compareObjects } from '../../../../util/scripts/objectCompare';

const LOGGER = new Logger('ActiveExtensionElementClickCallback.tsx');

/** Prepare ordinary deactivation without changing the live setup. */
export function prepareExtensionDeactivation(
  oldState: ExtensionsState,
  extensions: Extension[],
  userConfiguration: Record<string, unknown>,
) {
  let state = { ...oldState, tree: oldState.tree.copy() };
  extensions.forEach((ext) => {
    if (
      state.activeExtensions.some(
        (active) => createExtensionID(active) === createExtensionID(ext),
      )
    ) {
      state = removeExtensionFromExplicitlyActivatedExtensions(state, ext);
    }
  });
  const removedExtensions = [
    ...new Set([
      ...oldState.activeExtensions.filter(
        (ext) =>
          !state.activeExtensions.some(
            (active) => createExtensionID(active) === createExtensionID(ext),
          ),
      ),
      ...extensions.filter(
        (ext) =>
          !state.activeExtensions.some((active) => active.name === ext.name),
      ),
    ]),
  ];
  const user = removeProviderAiOverrides(
    filterExtensions(userConfiguration, removedExtensions),
    removedExtensions,
  );
  return {
    state: buildExtensionConfigurationDB(state),
    user,
    removedExtensions,
    disappearingEntries: Object.keys(userConfiguration).filter(
      (url) => !compareObjects(userConfiguration[url], user[url]),
    ),
  };
}

const activeExtensionElementClickCallback = async (ext: Extension) => {
  LOGGER.msg(`Deactivate ${ext.name}-${ext.version}`).info();

  const configuration = getStore().get(CONFIGURATION_FULL_REDUCER_ATOM);
  const userConfiguration = getStore().get(CONFIGURATION_USER_REDUCER_ATOM);
  const oldExtensionState = getStore().get(EXTENSION_STATE_REDUCER_ATOM);
  const {
    state: newExtensionState,
    user: newUserConfiguration,
    disappearingEntries,
  } = prepareExtensionDeactivation(oldExtensionState, [ext], userConfiguration);

  if (disappearingEntries.length > 0) {
    const confirmed = await showModalOkCancel({
      title: 'extensions.deactivate.config.loss.warning.title',
      message: {
        key: 'extensions.deactivate.config.loss.warning.message',
        args: {
          extensions: ext.name,
          entries: disappearingEntries.join('\n'),
        },
      },
    });

    if (!confirmed) {
      return;
    }
  }

  const res = newExtensionState;
  if (!(await reportAndConfirmBuildResult(res))) return;

  ConsoleLogger.info('New user configuration: ', newUserConfiguration);

  getStore().set(CONFIGURATION_USER_REDUCER_ATOM, {
    type: 'reset',
    value: newUserConfiguration,
  });

  getStore().set(CONFIGURATION_FULL_REDUCER_ATOM, {
    type: 'reset',
    value: filterExtensions(
      configuration,
      newExtensionState.installedExtensions,
    ),
  });

  getStore().set(CONFIGURATION_TOUCHED_REDUCER_ATOM, {
    type: 'reset',
    value: filterExtensions<boolean>(
      getStore().get(CONFIGURATION_TOUCHED_REDUCER_ATOM),
      newExtensionState.installedExtensions,
    ),
  });

  getStore().set(CONFIGURATION_QUALIFIER_REDUCER_ATOM, {
    type: 'reset',
    value: filterExtensions<ConfigurationQualifier>(
      getStore().get(CONFIGURATION_QUALIFIER_REDUCER_ATOM),
      newExtensionState.installedExtensions,
    ),
  });

  getStore().set(EXTENSION_STATE_INTERFACE_ATOM, res);

  getStore().set(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM, true);
};

export default activeExtensionElementClickCallback;
