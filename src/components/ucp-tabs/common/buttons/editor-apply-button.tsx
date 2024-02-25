import semver from 'semver';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { useTranslation } from 'react-i18next';
import { CheckCircleFill } from 'react-bootstrap-icons';
import { exists } from '@tauri-apps/api/fs';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import { showModalOk } from '../../../modals/modal-ok';
import { CONFIGURATION_TOUCHED_REDUCER_ATOM } from '../../../../function/configuration/state';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../../../function/extensions/state/state';
import { makeToast } from '../../../toasts/toasts-display';
import {
  CONFIG_DIRTY_STATE_ATOM,
  CONFIG_EXTENSIONS_DIRTY_STATE_ATOM,
} from './config-serialized-state';
import { toYaml } from '../../../../config/ucp/config-files';
import { createPluginConfigFromCurrentState } from '../../config-editor/buttons/export-as-plugin-button';
import { EXTENSION_EDITOR_STATE_ATOM } from '../extension-editor/extension-editor-state';
import {
  ConfigFile,
  Definition,
  Extension,
} from '../../../../config/ucp/common';
import { writeTextFile } from '../../../../tauri/tauri-files';
import { serializeDefinition } from '../../../../config/ucp/serialization';
import { ConsoleLogger } from '../../../../util/scripts/logging';
import { parseConfigEntries } from '../../../../function/extensions/discovery/parse-config-entries';
import { ExtensionTree } from '../../../../function/extensions/dependency-management/dependency-resolution';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';

function EditorApplyButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  const [extensionsState, setExtensionsState] = useAtom(
    EXTENSION_STATE_REDUCER_ATOM,
  );

  const [t] = useTranslation(['gui-general', 'gui-editor']);

  const setConfigStatus = (msg: string) => makeToast({ title: msg, body: '' });

  const configurationDirtyState = useAtomValue(CONFIG_DIRTY_STATE_ATOM);
  const setDirtyState = useSetAtom(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM);

  const editorState = useAtomValue(EXTENSION_EDITOR_STATE_ATOM);

  const setConfigurationTouched = useSetAtom(
    CONFIGURATION_TOUCHED_REDUCER_ATOM,
  );

  // eslint-disable-next-line react/jsx-no-useless-fragment
  if (editorState.state !== 'active') return <></>;

  const { extension } = editorState;

  return (
    <button
      className="ucp-button ucp-button-variant"
      type="button"
      onMouseEnter={() => {
        setStatusBarMessage(t('gui-editor:config.tooltip.apply'));
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
      onClick={async () => {
        try {
          const { plugin } = await createPluginConfigFromCurrentState();

          const missingDependencies =
            extensionsState.explicitlyActivatedExtensions.filter(
              (e) => extension.definition.dependencies[e.name] === undefined,
            );

          const newVersionDependencies =
            extensionsState.explicitlyActivatedExtensions.filter(
              (e) =>
                extension.definition.dependencies[e.name] !== undefined &&
                !semver.satisfies(
                  e.version,
                  extension.definition.dependencies[e.name],
                ),
            );

          const newDependencies = {
            ...extension.definition.dependencies,
            ...Object.fromEntries(
              [...missingDependencies, ...newVersionDependencies].map((e) => [
                e.name,
                new semver.Range(`^${e.version}`),
              ]),
            ),
          };

          const newDefinition = {
            ...extension.definition,
            dependencies: newDependencies,
          } as Definition;

          const newExtension = {
            ...extension,
            config: plugin as unknown as ConfigFile,
            configEntries: parseConfigEntries(extension.config).configEntries,
            definition: newDefinition,
          } as Extension;

          const tree = new ExtensionTree([
            ...extensionsState.extensions.filter(
              (e) => e.name !== newExtension.name,
            ),
            newExtension,
          ]);
          const solution = tree.tryResolveAllDependencies();

          if (solution.status !== 'ok') {
            ConsoleLogger.debug(`errors in dependencies`);
            const answer = await showModalOkCancel({
              title: 'Dependency errors',
              message: `The new extension contains dependency errors. Do you want to proceed anyway?\n\n${solution.messages.join('\n')}`,
            });

            if (!answer) {
              return;
            }
          }

          // Apply the changes
          // First part: hot-editing the extension
          extension.config = plugin as unknown as ConfigFile;
          const cep = parseConfigEntries(extension.config);
          extension.configEntries = cep.configEntries;

          extension.definition = newDefinition;

          extensionsState.tree.reset();
          extensionsState.tree.tryResolveAllDependencies();

          // Save the new files
          await extension.io.handle(async (eh) => {
            const pluginDir = eh.path;

            if (!(await exists(`${pluginDir}/definition.original.yml`))) {
              await writeTextFile(
                `${pluginDir}/definition.original.yml`,
                await eh.getTextContents(`definition.yml`),
              );
            }

            if (!(await exists(`${pluginDir}/config.original.yml`))) {
              await writeTextFile(
                `${pluginDir}/config.original.yml`,
                await eh.getTextContents(`config.yml`),
              );
            }

            const serializedDefinition = serializeDefinition(newDefinition);

            ConsoleLogger.debug('serialized definition', serializedDefinition);

            await writeTextFile(
              `${pluginDir}/definition.yml`,
              toYaml(serializedDefinition),
            );

            await writeTextFile(`${pluginDir}/config.yml`, toYaml(plugin));
          });

          // Update state
          setConfigurationTouched({ type: 'clear-all' });

          setConfigStatus(`Saved!`);

          setExtensionsState({
            ...extensionsState,
          });

          setDirtyState(false);
        } catch (e: any) {
          await showModalOk({
            title: 'ERROR',
            message: e.toString(),
          });
        }
      }}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    >
      <div className="ucp-button-variant-button-text d-flex align-items-center">
        {configurationDirtyState ? (
          <>
            <span style={{ paddingRight: '5px' }} />
            <span className="ms-auto pe-4">Save to extension *</span>
          </>
        ) : (
          <>
            <span style={{ paddingRight: '10px' }} />
            <CheckCircleFill className="" color="green" />{' '}
            <span className="ms-auto pe-4">Saved</span>
          </>
        )}
      </div>
    </button>
  );
}

export default EditorApplyButton;
