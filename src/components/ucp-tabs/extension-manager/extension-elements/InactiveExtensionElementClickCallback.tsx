import { showGeneralModalOkCancel } from 'components/modals/ModalOkCancel';
import { Extension } from 'config/ucp/common';
import { getStore } from 'hooks/jotai/base';
import {
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  EXTENSION_STATE_REDUCER_ATOM,
  GAME_FOLDER_ATOM,
} from 'function/global/global-atoms';
import Logger, { ConsoleLogger } from 'util/scripts/logging';
import { createReceivePluginPathsFunction } from 'components/sandbox-menu/sandbox-menu-functions';
import { readAndFilterPaths, slashify } from 'tauri/tauri-invoke';
import warnClearingOfConfiguration from '../../common/WarnClearingOfConfiguration';
import { buildExtensionConfigurationDB } from '../extension-configuration';
import { addExtensionToExplicityActivatedExtensions } from '../extensions-state';
import { propagateActiveExtensionsChange } from '../propagateActiveExtensionChange';

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
      const confirmed1 = await showGeneralModalOkCancel({
        title: 'Error',
        message: msg,
      });
      if (!confirmed1) return;
    }
    if (res.configuration.warnings.length > 0) {
      const msg = `Be warned, new configuration has ${res.configuration.warnings.length} warnings. Proceed anyway?`;
      LOGGER.msg(msg).warn();
      const confirmed2 = await showGeneralModalOkCancel({
        title: 'Warning',
        message: msg,
      });
      if (!confirmed2) return;
    }
  } else {
    LOGGER.msg(`New configuration build without errors or warnings`).info();
  }

  propagateActiveExtensionsChange(res);

  getStore().set(EXTENSION_STATE_REDUCER_ATOM, res);
  ConsoleLogger.debug('New extension state', res);
};

export default inactiveExtensionElementClickCallback;
