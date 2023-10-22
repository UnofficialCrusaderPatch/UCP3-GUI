import warnClearingOfConfiguration from 'components/ucp-tabs/common/WarnClearingOfConfiguration';
import { getStore } from 'hooks/jotai/base';
import {
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  EXTENSION_STATE_REDUCER_ATOM,
} from 'function/global/global-atoms';
import { moveExtension } from '../extensions-state';

const moveExtensionClickCallback = async (event: {
  name: string;
  type: 'up' | 'down';
}) => {
  const confirmed = await warnClearingOfConfiguration(
    getStore().get(CONFIGURATION_TOUCHED_REDUCER_ATOM),
  );
  if (!confirmed) {
    return;
  }

  const newExtensionsState = moveExtension(
    getStore().get(EXTENSION_STATE_REDUCER_ATOM),
    event,
  );

  getStore().set(EXTENSION_STATE_REDUCER_ATOM, newExtensionsState);
};

export default moveExtensionClickCallback;
