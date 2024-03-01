import semver from 'semver';
import { exists, writeTextFile } from '@tauri-apps/api/fs';
import {
  ConfigFile,
  Definition,
  Extension,
} from '../../../../config/ucp/common';
import { ExtensionsState } from '../../../../function/extensions/extensions-state';
import { createPluginConfigFromCurrentState } from '../../config-editor/buttons/export-as-plugin-button';
import { toYaml } from '../../../../config/ucp/config-files/config-files';
import { serializeDefinition } from '../../../../config/ucp/serialization';
import { ExtensionTree } from '../../../../function/extensions/dependency-management/dependency-resolution';
import { parseConfigEntries } from '../../../../function/extensions/discovery/parse-config-entries';
import { ConsoleLogger } from '../../../../util/scripts/logging';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';

export type EditorApplyButtonCallbackResult = {
  apply: boolean;
  state: ExtensionsState;
};

// eslint-disable-next-line import/prefer-default-export
export const editorApplyButtonCallback = async (
  extensionsState: ExtensionsState,
  extension: Extension,
) => {
  const { plugin } = await createPluginConfigFromCurrentState();

  const missingDependencies =
    extensionsState.explicitlyActivatedExtensions.filter(
      (e) => extension.definition.dependencies[e.name] === undefined,
    );

  const newVersionDependencies =
    extensionsState.explicitlyActivatedExtensions.filter(
      (e) =>
        extension.definition.dependencies[e.name] !== undefined &&
        !semver.satisfies(e.version, extension.definition.dependencies[e.name]),
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

  const tree = new ExtensionTree(
    [
      ...extensionsState.extensions.filter((e) => e.name !== newExtension.name),
      newExtension,
    ],
    extensionsState.tree.frontendVersion,
    extensionsState.tree.frameworkVersion,
  );
  const solution = tree.tryResolveAllDependencies();

  if (solution.status !== 'ok') {
    ConsoleLogger.debug(`errors in dependencies`);
    const answer = await showModalOkCancel({
      title: 'Dependency errors',
      message: `The new extension contains dependency errors. Do you want to proceed anyway?\n\n${solution.messages.join('\n')}`,
    });

    if (!answer) {
      return {
        apply: false,
        state: extensionsState,
      } as EditorApplyButtonCallbackResult;
    }
  }

  // Apply the changes
  // First part: hot-editing the extension
  // eslint-disable-next-line no-param-reassign
  extension.config = plugin as unknown as ConfigFile;
  const cep = parseConfigEntries(extension.config);
  // eslint-disable-next-line no-param-reassign
  extension.configEntries = cep.configEntries;

  // eslint-disable-next-line no-param-reassign
  extension.definition = newDefinition;

  extensionsState.tree.reset();
  extensionsState.tree.tryResolveAllDependencies();

  // Save the new files
  await extension.io.handle(async (eh) => {
    const pluginDir = eh.path;

    if (
      !(await exists(`${pluginDir}/definition.original.yml`)) &&
      (await eh.doesEntryExist('definition.yml'))
    ) {
      await writeTextFile(
        `${pluginDir}/definition.original.yml`,
        await eh.getTextContents(`definition.yml`),
      );
    }

    if (
      !(await exists(`${pluginDir}/config.original.yml`)) &&
      (await eh.doesEntryExist('config.yml'))
    ) {
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

  return {
    apply: true,
    state: { ...extensionsState },
  } as EditorApplyButtonCallbackResult;
};
