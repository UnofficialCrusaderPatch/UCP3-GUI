import { createDir, exists, writeTextFile } from '@tauri-apps/api/fs';
import semver from 'semver';
import { useSetAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import { showModalCreatePlugin } from '../../../modals/modal-create-plugin';
import { showModalOk } from '../../../modals/modal-ok';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';
import {
  UCP3SerializedPluginConfig,
  UCP3SerializedUserConfig,
  serializeUCPConfig,
  toYaml,
} from '../../../../config/ucp/config-files';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
} from '../../../../function/configuration/state';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../../../function/extensions/state/state';
import { useCurrentGameFolder } from '../../../../function/game-folder/utils';
import { reloadCurrentWindow } from '../../../../function/window-actions';
import { getStore } from '../../../../hooks/jotai/base';

export const createPluginConfigFromCurrentState = async () => {
  const userConfiguration = getStore().get(CONFIGURATION_USER_REDUCER_ATOM);
  const configuration = getStore().get(CONFIGURATION_FULL_REDUCER_ATOM);
  const extensionsState = getStore().get(EXTENSION_STATE_REDUCER_ATOM);
  const { activeExtensions } = extensionsState;

  const configurationQualifier = getStore().get(
    CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  );

  const result = await serializeUCPConfig(
    userConfiguration,
    configuration,
    extensionsState.explicitlyActivatedExtensions,
    activeExtensions,
    configurationQualifier,
  );

  return {
    plugin: {
      'config-sparse': {
        modules: result['config-sparse'].modules,
        plugins: result['config-sparse'].plugins,
      },
      meta: result.meta,
    } as UCP3SerializedPluginConfig,
    user: result as UCP3SerializedUserConfig,
  };
};

const serializeDependencies = (deps: { [ext: string]: semver.Range }) =>
  Object.fromEntries(
    Object.entries(deps).map(([name, range]) => [name, range.raw]),
  );

const createDependenciesFromExplicitlyActiveExtensions = () => {
  const extensionsState = getStore().get(EXTENSION_STATE_REDUCER_ATOM);
  const { explicitlyActivatedExtensions } = extensionsState;

  return Object.fromEntries(
    explicitlyActivatedExtensions.map((e) => [
      e.name,
      new semver.Range(`^${e.version}`),
    ]),
  );
};

function ExportAsPluginButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const gameFolder = useCurrentGameFolder();

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
          const { plugin } = await createPluginConfigFromCurrentState();

          const r = await showModalCreatePlugin({
            title: 'Create plugin',
            message: '',
          });

          if (r === undefined) return;

          const pluginDir = `${gameFolder}/ucp/plugins/${r.pluginName}-${r.pluginVersion}`;

          if (await exists(pluginDir)) {
            await showModalOkCancel({
              title: 'Plugin already exists',
              message: `The plugin already exists, cannot proceed:\n${pluginDir}`,
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
              dependencies: serializeDependencies(
                createDependenciesFromExplicitlyActiveExtensions(),
              ),
            }),
          );

          await writeTextFile(`${pluginDir}/config.yml`, toYaml(plugin));

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
