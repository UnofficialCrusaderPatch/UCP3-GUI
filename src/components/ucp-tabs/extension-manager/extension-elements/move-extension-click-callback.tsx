import { getStore } from '../../../../hooks/jotai/base';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../../../function/extensions/state/state';
import { moveExtension } from '../extensions-state-manipulation';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from '../../common/buttons/config-serialized-state';
import { buildExtensionConfigurationDB } from '../extension-configuration';
import reportAndConfirmBuildResult from './reporting';
import Logger from '../../../../util/scripts/logging';

const LOGGER = new Logger('move-extension-callback.ts');

const moveExtensionClickCallback = async (event: {
  name: string;
  type: 'up' | 'down';
}) => {
  LOGGER.msg(`moving ${event.name} ${event.type}`).info();

  const newExtensionsState = moveExtension(
    getStore().get(EXTENSION_STATE_REDUCER_ATOM),
    event,
  );

  const res = buildExtensionConfigurationDB(newExtensionsState);

  if (!(await reportAndConfirmBuildResult(res))) return;

  getStore().set(EXTENSION_STATE_REDUCER_ATOM, res);

  getStore().set(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM, true);
};

export default moveExtensionClickCallback;
