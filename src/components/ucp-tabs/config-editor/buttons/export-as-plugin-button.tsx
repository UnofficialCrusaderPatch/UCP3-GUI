import yaml from 'yaml';
import { createDir, exists, writeTextFile } from '@tauri-apps/api/fs';
import { useSetAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import { showModalCreatePlugin } from '../../../modals/modal-create-plugin';
import { showModalOk } from '../../../modals/modal-ok';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';
import {
  UCP3SerializedDefinition,
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
import { useCurrentGameFolder } from '../../../../function/game-folder/state';
import { reloadCurrentWindow } from '../../../../function/window-actions';
import { readTextFile } from '../../../../tauri/tauri-files';
import { getStore } from '../../../../hooks/jotai/base';

const createPluginConfigFromCurrentState = async () => {
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

const mergeDefinitions = (
  pluginDefinition: UCP3SerializedDefinition,
  newDefinition: UCP3SerializedDefinition,
) => {
  const definition = {
    ...pluginDefinition,
    name: pluginDefinition.name,
    author: pluginDefinition.author || newDefinition.author,
    version: pluginDefinition.version,
    dependencies: [...(pluginDefinition.dependencies || new Array<string>())],
  };

  definition.dependencies = [
    ...definition.dependencies,
    ...newDefinition.dependencies
      .filter((ds) => !ds.startsWith(pluginDefinition.name))
      .map((s) => s.replaceAll('==', '>=')),
  ];

  return definition;
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
          const { plugin, user } = await createPluginConfigFromCurrentState();

          const r = await showModalCreatePlugin({
            title: 'Create plugin',
            message: '',
          });

          if (r === undefined) return;

          const pluginDir = `${gameFolder}/ucp/plugins/${r.pluginName}-${r.pluginVersion}`;

          if (await exists(pluginDir)) {
            if (r.type !== 'overwrite') {
              const overwrite = showModalOkCancel({
                title: 'Plugin already exists',
                message:
                  'The plugin already exists, proceed? \n\n Overwrites config.yml and update dependencies in definition.yml',
              });
              if (!overwrite) return;
            } else {
              const overwrite = showModalOkCancel({
                title: 'Are you sure?',
                message:
                  'Overwrites config.yml and update dependencies in definition.yml of the selected folder',
              });
              if (!overwrite) return;
            }

            let definition = {
              name: r.pluginName,
              author: r.pluginAuthor,
              version: r.pluginVersion,
              dependencies: [
                ...user['config-sparse']['load-order']
                  .filter(
                    (ds) =>
                      !(
                        ds.startsWith(r.pluginName) &&
                        ds.endsWith(r.pluginVersion)
                      ),
                  )
                  .map((s) => s.replaceAll('==', '>=')),
              ],
              type: 'plugin',
              'display-name': r.pluginName,
              description: '',
              meta: {
                version: '1.0.0',
              },
            } as UCP3SerializedDefinition;

            if (await exists(`${pluginDir}/definition.yml`)) {
              const existingDefinition = await yaml.parse(
                (
                  await readTextFile(`${pluginDir}/definition.yml`)
                ).getOrThrow(),
              );
              definition = mergeDefinitions(existingDefinition, definition);
            }

            await writeTextFile(
              `${pluginDir}/definition.yml`,
              toYaml(definition),
              { append: false },
            );

            let pluginConfig = { 'config-sparse': {} };

            if (await exists(`${pluginDir}/config.yml`)) {
              pluginConfig = await yaml.parse(
                (await readTextFile(`${pluginDir}/config.yml`)).getOrThrow(),
              );
            }

            pluginConfig['config-sparse'] = {
              ...pluginConfig['config-sparse'],
              ...plugin['config-sparse'],
            };

            await writeTextFile(
              `${pluginDir}/config.yml`,
              toYaml(pluginConfig),
            );
          } else {
            await createDir(pluginDir);

            await writeTextFile(
              `${pluginDir}/definition.yml`,
              toYaml({
                name: r.pluginName,
                author: r.pluginAuthor,
                version: r.pluginVersion,
                dependencies: user['config-sparse']['load-order'].map((s) =>
                  s.replaceAll('==', '>='),
                ),
              }),
            );

            await writeTextFile(`${pluginDir}/config.yml`, toYaml(plugin));
          }

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
