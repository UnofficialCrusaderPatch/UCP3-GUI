import { Extension } from 'config/ucp/common';
import { ConfigMetaObjectDB } from 'config/ucp/config-merge/objects';
import { ConfigurationQualifier, ExtensionsState } from 'function/global/types';
import { SetStateAction } from 'react';
import { saveFileDialog } from 'tauri/tauri-dialog';
import { TFunction } from 'i18next';
import saveConfig from './SaveConfig';

const exportButtonCallback = async (
  gameFolder: string,
  setConfigStatus: (value: string) => void,
  configuration: { [x: string]: unknown },
  configurationTouched: { [x: string]: boolean },
  extensionsState: ExtensionsState,
  activeExtensions: Extension[],
  configurationQualifier: { [x: string]: ConfigurationQualifier },
  t: TFunction<[string, string], undefined>
) => {
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
