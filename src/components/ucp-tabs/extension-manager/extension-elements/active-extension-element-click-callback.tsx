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
import { buildExtensionConfigurationDB } from '../extension-configuration';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from '../../common/buttons/config-serialized-state';
import { filterOutExtensions } from './filter-out-extensions';

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

  const newUserConfiguration = filterOutExtensions(
    userConfiguration,
    newExtensionState.installedExtensions,
  );

  const res = buildExtensionConfigurationDB(newExtensionState);

  if (res.configuration.statusCode !== 0) {
    if (res.configuration.statusCode === 2) {
      const msg = `Invalid extension configuration. New configuration has ${res.configuration.errors.length} errors. Try to proceed anyway?`;
      LOGGER.msg(msg).error();
      const confirmed1 = await showModalOkCancel({
        title: 'Error',
        message: msg,
      });
      if (!confirmed1) return;
    }
    if (res.configuration.warnings.length > 0) {
      const msg = `Be warned, new configuration has ${res.configuration.warnings.length} warnings. Proceed anyway?`;
      LOGGER.msg(msg).warn();
      const confirmed2 = await showModalOkCancel({
        title: 'Warning',
        message: msg,
      });
      if (!confirmed2) return;
    }
  } else {
    LOGGER.msg('New configuration build without errors or warnings').info();
  }

  getStore().set(EXTENSION_STATE_INTERFACE_ATOM, res);

  getStore().set(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM, true);

  ConsoleLogger.info('New user configuration: ', newUserConfiguration);

  getStore().set(CONFIGURATION_USER_REDUCER_ATOM, {
    type: 'reset',
    value: newUserConfiguration,
  });

  getStore().set(CONFIGURATION_FULL_REDUCER_ATOM, {
    type: 'reset',
    value: filterOutExtensions(
      configuration,
      newExtensionState.installedExtensions,
    ),
  });

  getStore().set(CONFIGURATION_TOUCHED_REDUCER_ATOM, {
    type: 'reset',
    value: filterOutExtensions<boolean>(
      getStore().get(CONFIGURATION_TOUCHED_REDUCER_ATOM),
      newExtensionState.installedExtensions,
    ),
  });

  getStore().set(CONFIGURATION_QUALIFIER_REDUCER_ATOM, {
    type: 'reset',
    value: filterOutExtensions<ConfigurationQualifier>(
      getStore().get(CONFIGURATION_QUALIFIER_REDUCER_ATOM),
      newExtensionState.installedExtensions,
    ),
  });
};

export default activeExtensionElementClickCallback;
