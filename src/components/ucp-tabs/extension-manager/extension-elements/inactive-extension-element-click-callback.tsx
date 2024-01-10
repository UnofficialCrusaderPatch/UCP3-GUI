import {
  EXTENSION_STATE_INTERFACE_ATOM,
  EXTENSION_STATE_REDUCER_ATOM,
} from '../../../../function/extensions/state/state';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';
import { Extension } from '../../../../config/ucp/common';
import { getStore } from '../../../../hooks/jotai/base';
import { CONFIGURATION_TOUCHED_REDUCER_ATOM } from '../../../../function/configuration/state';
import Logger, { ConsoleLogger } from '../../../../util/scripts/logging';
import warnClearingOfConfiguration from '../../common/warn-clearing-of-configuration';
import { buildExtensionConfigurationDB } from '../extension-configuration';
import { addExtensionToExplicityActivatedExtensions } from '../extensions-state';

const LOGGER = new Logger('InactiveExtensionElementClickCallback.tsx');

const inactiveExtensionElementClickCallback = async (ext: Extension) => {
  // TODO: include a check where it checks whether the right version of an extension is available and selected (version dropdown box)

  const confirmed = await warnClearingOfConfiguration(
    getStore().get(CONFIGURATION_TOUCHED_REDUCER_ATOM),
  );

  const eState = getStore().get(EXTENSION_STATE_REDUCER_ATOM);

  if (!confirmed) {
    return;
  }

  const newExtensionState = await addExtensionToExplicityActivatedExtensions(
    eState,
    ext,
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
    LOGGER.msg(`New configuration build without errors or warnings`).info();
  }

  getStore().set(EXTENSION_STATE_INTERFACE_ATOM, res);
  ConsoleLogger.debug('New extension state', res);
};

export default inactiveExtensionElementClickCallback;
