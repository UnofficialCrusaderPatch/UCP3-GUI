import { saveFileDialog } from '../../../tauri/tauri-dialog';
import { getStore } from '../../../hooks/jotai/base';
import {
  CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../function/configuration/state';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../../function/extensions/state/state';
import saveConfig from './save-config';
import { Message } from '../../../localization/localization';

const exportButtonCallback = async (
  gameFolder: string,
  setConfigStatus: (value: Message) => void,
  localize: (message: Message) => string,
) => {
  const userConfiguration = getStore().get(CONFIGURATION_USER_REDUCER_ATOM);
  const fullConfiguration = getStore().get(CONFIGURATION_FULL_REDUCER_ATOM);
  const extensionsState = getStore().get(EXTENSION_STATE_REDUCER_ATOM);
  const { activeExtensions } = extensionsState;
  const configurationQualifier = getStore().get(
    CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  );

  const filePathOptional = await saveFileDialog(gameFolder, [
    {
      name: localize('file.config'),
      extensions: ['yml', 'yaml'],
    },
    { name: localize('file.all'), extensions: ['*'] },
  ]);
  if (filePathOptional.isEmpty()) {
    setConfigStatus('config.status.cancelled');
    return;
  }
  let filePath = filePathOptional.get();

  if (!filePath.endsWith('.yml')) filePath = `${filePath}.yml`;

  saveConfig(
    fullConfiguration,
    userConfiguration,
    filePath,
    extensionsState.explicitlyActivatedExtensions,
    activeExtensions,
    configurationQualifier,
  )
    .then(() => setConfigStatus('config.status.exported'))
    .catch((e) => {
      throw new Error(e);
    });
};

export default exportButtonCallback;
