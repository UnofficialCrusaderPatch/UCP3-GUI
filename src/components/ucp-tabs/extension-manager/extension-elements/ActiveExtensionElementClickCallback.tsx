import { Extension } from 'config/ucp/common';
import { getStore } from 'hooks/jotai/base';
import {
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  EXTENSION_STATE_REDUCER_ATOM,
} from 'function/global/global-atoms';
import { propagateActiveExtensionsChange } from 'components/ucp-tabs/extension-manager/propagateActiveExtensionChange';
import { showModalOkCancel } from 'components/modals/modal-ok-cancel';
import Logger from 'util/scripts/logging';
import warnClearingOfConfiguration from '../../common/WarnClearingOfConfiguration';
import { removeExtensionFromExplicitlyActivatedExtensions } from '../extensions-state';
import { buildExtensionConfigurationDB } from '../extension-configuration';

const LOGGER = new Logger('ActiveExtensionElementClickCallback.tsx');

const activeExtensionElementClickCallback = async (ext: Extension) => {
  LOGGER.msg(`Deactivate ${ext.name}-${ext.version}`).info();
  const confirmed = await warnClearingOfConfiguration(
    getStore().get(CONFIGURATION_TOUCHED_REDUCER_ATOM),
  );
  if (!confirmed) {
    return;
  }
  const newExtensionState =
    await removeExtensionFromExplicitlyActivatedExtensions(
      getStore().get(EXTENSION_STATE_REDUCER_ATOM),
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
    LOGGER.msg('New configuration build without errors or warnings').info();
  }

  propagateActiveExtensionsChange(res);

  getStore().set(EXTENSION_STATE_REDUCER_ATOM, res);
};

export default activeExtensionElementClickCallback;
