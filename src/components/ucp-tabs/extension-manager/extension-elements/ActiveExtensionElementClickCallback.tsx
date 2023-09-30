import { Extension } from 'config/ucp/common';
import { getStore } from 'hooks/jotai/base';
import {
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  EXTENSION_STATE_REDUCER_ATOM,
} from 'function/global/global-atoms';
import { propagateActiveExtensionsChange } from 'components/ucp-tabs/helpers';
import { showGeneralModalOkCancel } from 'components/modals/ModalOkCancel';
import warnClearingOfConfiguration from '../../common/WarnClearingOfConfiguration';
import { removeExtensionFromExplicitlyActivatedExtensions } from '../extensions-state';
import { buildExtensionConfigurationDB } from '../extension-configuration';

const activeExtensionElementClickCallback = async (ext: Extension) => {
  console.log('deactivate', ext);
  const confirmed = await warnClearingOfConfiguration(
    getStore().get(CONFIGURATION_TOUCHED_REDUCER_ATOM)
  );
  if (!confirmed) {
    return;
  }
  const newExtensionState =
    await removeExtensionFromExplicitlyActivatedExtensions(
      getStore().get(EXTENSION_STATE_REDUCER_ATOM),
      ext
    );

  const res = buildExtensionConfigurationDB(newExtensionState);

  if (res.configuration.statusCode !== 0) {
    if (res.configuration.statusCode === 2) {
      const confirmed1 = await showGeneralModalOkCancel({
        title: 'Error',
        message: `Invalid extension configuration. New configuration has ${res.configuration.errors.length} errors. Try to proceed anyway?`,
      });
      if (confirmed1) return;
    }
    const confirmed2 = await showGeneralModalOkCancel({
      title: 'Warning',
      message: `Be warned, new configuration has ${res.configuration.warnings.length} warnings. Proceed anyway?`,
    });
    if (confirmed2) return;
  } else {
    console.log(`New configuration build without errors or warnings`);
  }

  propagateActiveExtensionsChange(res);

  getStore().set(EXTENSION_STATE_REDUCER_ATOM, res);
};

export default activeExtensionElementClickCallback;
