import { Extension } from 'config/ucp/common';
import { getStore } from 'hooks/jotai/base';
import {
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  EXTENSION_STATE_REDUCER_ATOM,
} from 'function/global/global-atoms';
import warnClearingOfConfiguration from '../../common/WarnClearingOfConfiguration';
import { removeExtensionFromExplicitlyActivatedExtensions } from '../extensions-state';

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

  getStore().set(EXTENSION_STATE_REDUCER_ATOM, newExtensionState);
};

export default activeExtensionElementClickCallback;
