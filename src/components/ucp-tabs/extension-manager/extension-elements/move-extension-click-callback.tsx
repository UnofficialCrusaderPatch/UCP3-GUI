import warnClearingOfConfiguration from '../../common/warn-clearing-of-configuration';
import { getStore } from '../../../../hooks/jotai/base';
import { CONFIGURATION_TOUCHED_REDUCER_ATOM } from '../../../../function/configuration/state';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../../../function/extensions/state/state';
import { moveExtension } from '../extensions-state-manipulation';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from '../../common/buttons/config-serialized-state';

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

  getStore().set(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM, true);
};

export default moveExtensionClickCallback;
