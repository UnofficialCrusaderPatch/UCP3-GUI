import { Extension } from 'config/ucp/common';
import { ConfigMetaObjectDB } from 'config/ucp/config-merge/objects';
import { ConfigurationQualifier, ExtensionsState } from 'function/global/types';
import { SetStateAction } from 'react';
import { saveFileDialog } from 'tauri/tauri-dialog';
import { TFunction } from 'i18next';
import { getStore } from 'hooks/jotai/base';
import {
  CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  CONFIGURATION_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  EXTENSION_STATE_REDUCER_ATOM,
} from 'function/global/global-atoms';
import saveConfig from './SaveConfig';

const exportButtonCallback = async (
  gameFolder: string,
  setConfigStatus: (value: string) => void,
  t: TFunction<[string, string], undefined>
) => {
  const configuration = getStore().get(CONFIGURATION_REDUCER_ATOM);
  const configurationTouched = getStore().get(
    CONFIGURATION_TOUCHED_REDUCER_ATOM
  );
  const extensionsState = getStore().get(EXTENSION_STATE_REDUCER_ATOM);
  const { activeExtensions } = extensionsState;
  const configurationQualifier = getStore().get(
    CONFIGURATION_QUALIFIER_REDUCER_ATOM
  );

  const filePathOptional = await saveFileDialog(gameFolder, [
    {
      name: t('gui-general:file.config'),
      extensions: ['yml', 'yaml'],
    },
    { name: t('gui-general:file.all'), extensions: ['*'] },
  ]);
  if (filePathOptional.isEmpty()) {
    setConfigStatus(t('gui-editor:config.status.cancelled'));
    return;
  }
  let filePath = filePathOptional.get();

  if (!filePath.endsWith('.yml')) filePath = `${filePath}.yml`;

  saveConfig(
    configuration,
    filePath,
    configurationTouched,
    extensionsState.explicitlyActivatedExtensions,
    activeExtensions,
    configurationQualifier
  )
    .then(() => setConfigStatus(t('gui-editor:config.status.exported')))
    .catch((e) => {
      throw new Error(e);
    });
};

export default exportButtonCallback;
