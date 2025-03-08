import { Extension } from '../../../../config/ucp/common';
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

const LOGGER = new Logger('ActiveExtensionElementClickCallback.tsx');

const activeExtensionElementClickCallback = async (ext: Extension) => {
  LOGGER.msg(`Deactivate ${ext.name}-${ext.version}`).info();

  const configuration = getStore().get(CONFIGURATION_FULL_REDUCER_ATOM);
  const userConfiguration = getStore().get(CONFIGURATION_USER_REDUCER_ATOM);
  const newExtensionState =
    await removeExtensionFromExplicitlyActivatedExtensions(
      getStore().get(EXTENSION_STATE_REDUCER_ATOM),
      ext,
    );

  const disappearingEntries = Object.keys(userConfiguration).filter(
    (url) =>
      newExtensionState.installedExtensions
        .map((e) => e.name)
        .filter((name) => url.startsWith(`${name}.`)).length > 0,
  );

  if (disappearingEntries.length > 0) {
    const confirmed = await showModalOkCancel({
      title: 'Warning',
      message: `Deactivating extensions ${
        ext.name
      } will lead you to lose your settings for the options below, proceed?\n\n${disappearingEntries.join(
        '\n',
      )}`,
    });

    if (!confirmed) {
      return;
    }
  }

  const newUserConfiguration = filterExtensions(
    userConfiguration,
    newExtensionState.installedExtensions,
  );

  const res = buildExtensionConfigurationDB(newExtensionState);
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
