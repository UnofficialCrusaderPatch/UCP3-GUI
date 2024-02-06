import { createDir, writeTextFile } from '@tauri-apps/api/fs';
import { exists } from 'i18next';
import { useAtomValue, useSetAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import { showModalCreatePlugin } from '../../../modals/modal-create-plugin';
import { showModalOk } from '../../../modals/modal-ok';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';
import {
  UCP3SerializedPluginConfig,
  serializeUCPConfig,
  toYaml,
} from '../../../../config/ucp/config-files';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../../function/configuration/state';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../../../function/extensions/state/state';
import { useCurrentGameFolder } from '../../../../function/game-folder/state';
import { reloadCurrentWindow } from '../../../../function/window-actions';
import { ConsoleLogger } from '../../../../util/scripts/logging';

function ExportAsPluginButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const gameFolder = useCurrentGameFolder();
  const userConfiguration = useAtomValue(CONFIGURATION_USER_REDUCER_ATOM);
  const configuration = useAtomValue(CONFIGURATION_FULL_REDUCER_ATOM);
  const extensionsState = useAtomValue(EXTENSION_STATE_REDUCER_ATOM);
  const { activeExtensions } = extensionsState;

  const configurationQualifier = useAtomValue(
    CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  );

  const [t] = useTranslation(['gui-general', 'gui-editor']);

  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  return (
    <button
      className="ucp-button ucp-button-variant"
      type="button"
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
      onClick={async () => {
        try {
          const result = await serializeUCPConfig(
            userConfiguration,
            configuration,
            extensionsState.explicitlyActivatedExtensions,
            activeExtensions,
            configurationQualifier,
          );
          const trimmedResult = {
            'config-sparse': {
              modules: result['config-sparse'].modules,
              plugins: result['config-sparse'].plugins,
            },
            meta: result.meta,
          } as UCP3SerializedPluginConfig;

          ConsoleLogger.debug(trimmedResult);

          const r = await showModalCreatePlugin({
            title: 'Create plugin',
            message: '',
          });

          ConsoleLogger.debug(r);

          if (r === undefined) return;

          // const gameFolder = getStore().get(GAME_FOLDER_ATOM);

          const pluginDir = `${gameFolder}/ucp/plugins/${r.pluginName}-${r.pluginVersion}`;

          if (await exists(pluginDir)) {
            await showModalOk({
              message: `directory already exists: ${pluginDir}`,
              title: 'cannot create plugin',
            });
            return;
          }

          await createDir(pluginDir);

          await writeTextFile(
            `${pluginDir}/definition.yml`,
            toYaml({
              name: r.pluginName,
              author: r.pluginAuthor,
              version: r.pluginVersion,
              dependencies: result['config-sparse']['load-order'],
            }),
          );

          await writeTextFile(`${pluginDir}/config.yml`, toYaml(trimmedResult));

          const confirmed = await showModalOkCancel({
            title: t('gui-general:require.reload.title'),
            message: t('gui-editor:overview.require.reload.text'),
          });

          if (confirmed) {
            reloadCurrentWindow();
          }
        } catch (e: any) {
          await showModalOk({
            title: 'ERROR',
            message: e.toString(),
          });
        }
      }}
      onMouseEnter={() => {
        setStatusBarMessage(t('gui-editor:config.tooltip.plugin'));
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
      <div className="ucp-button-variant-button-text">
        {t('gui-editor:plugin.create')}
      </div>
    </button>
  );
}

export default ExportAsPluginButton;
