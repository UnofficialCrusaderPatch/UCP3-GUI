import {
  EXTENSION_STATE_INTERFACE_ATOM,
  EXTENSION_STATE_REDUCER_ATOM,
} from '../../../../function/extensions/state/state';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';
import { Extension } from '../../../../config/ucp/common';
import { getStore } from '../../../../hooks/jotai/base';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../../function/configuration/state';
import Logger, { ConsoleLogger } from '../../../../util/scripts/logging';
import { buildExtensionConfigurationDB } from '../extension-configuration';
import { addExtensionToExplicityActivatedExtensions } from '../extensions-state-manipulation';
import { ConfigMetaObject } from '../../../../config/ucp/config-merge/objects';

const LOGGER = new Logger('InactiveExtensionElementClickCallback.tsx');

const inactiveExtensionElementClickCallback = async (ext: Extension) => {
  // TODO: include a check where it checks whether the right version of an extension is available and selected (version dropdown box)

  LOGGER.msg('inactiveExtensionElementClickCallback').info();

  const configurationTouched = getStore().get(
    CONFIGURATION_TOUCHED_REDUCER_ATOM,
  );

  const currentExtensionsState = getStore().get(EXTENSION_STATE_REDUCER_ATOM);

  const newExtensionsState = await addExtensionToExplicityActivatedExtensions(
    currentExtensionsState,
    ext,
  );

  const res = buildExtensionConfigurationDB(newExtensionsState);

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
    LOGGER.msg(`New configuration build without errors or warnings`).info();
  }

  // TODO: insert logic to integrate existing customisations with the new thing.
  const touchedConfig = Object.entries(
    getStore().get(CONFIGURATION_FULL_REDUCER_ATOM),
  ).filter(([url]) => configurationTouched[url] === true);

  const newRequiredValues = Object.fromEntries(
    Object.entries(res.configuration.state).filter(
      ([, cmo]: [string, ConfigMetaObject]) =>
        cmo.modifications.value.qualifier === 'required',
    ),
  );

  const lostConfig = touchedConfig.filter(
    ([url]) => newRequiredValues[url] !== undefined,
  );

  if (lostConfig.length > 0) {
    const answer = await showModalOkCancel({
      title: 'Losing customisations',
      message: `You will lose ${
        lostConfig.length
      } customisations. Do you want to proceed?\n\nLosing customisations:\n${lostConfig
        .map(([url]) => url)
        .sort()}`,
    });

    if (!answer) {
      return;
    }
  }

  ConsoleLogger.info(
    'Current full config state',
    getStore().get(CONFIGURATION_FULL_REDUCER_ATOM),
  );

  ConsoleLogger.info(
    'Current user config state',
    getStore().get(CONFIGURATION_USER_REDUCER_ATOM),
  );

  getStore().set(EXTENSION_STATE_INTERFACE_ATOM, res);

  ConsoleLogger.info('New extension state', res);
  ConsoleLogger.info(
    'New full config state',
    getStore().get(CONFIGURATION_FULL_REDUCER_ATOM),
  );

  ConsoleLogger.info(
    'New user config state',
    getStore().get(CONFIGURATION_USER_REDUCER_ATOM),
  );
};

export default inactiveExtensionElementClickCallback;
