import semver from 'semver';
import { writeTextFile } from '@tauri-apps/api/fs';
import {
  ConfigFile,
  Definition,
  Extension,
} from '../../../../config/ucp/common';
import { ExtensionsState } from '../../../../function/extensions/extensions-state';
import { createPluginConfigFromCurrentState } from '../../config-editor/buttons/export-as-plugin-button';
import { toYaml } from '../../../../config/ucp/config-files/config-files';
import { serializeDefinition } from '../../../../config/ucp/serialization';
import { ExtensionDependencyTree } from '../../../../function/extensions/dependency-management/dependency-resolution';
import { parseConfigEntries } from '../../../../function/extensions/discovery/parse-config-entries';
import { ConsoleLogger } from '../../../../util/scripts/logging';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';

export type EditorApplyButtonCallbackResult = {
  apply: boolean;
  state: ExtensionsState;
};

// eslint-disable-next-line import/prefer-default-export
export async function editorApplyButtonCallback(
  extensionsState: ExtensionsState,
  extension: Extension,
) {
  const { plugin } = await createPluginConfigFromCurrentState();

  const eaeNames = extensionsState.explicitlyActivatedExtensions.map(
    (ext) => ext.name,
  );
  const droppedExtensionNames = Object.entries(
    extension.definition.dependencies,
  )
    .filter(([name]) => eaeNames.indexOf(name) === -1)
    .map(([name]) => name);

  /**
   * Dependencies that are still in the active extensions list
   */
  const retainedDependencies = Object.fromEntries(
    Object.entries(extension.definition.dependencies).filter(
      ([name]) => droppedExtensionNames.indexOf(name) === -1,
    ),
  );

  /**
   * Dependencies that weren't in the definition yet
   */
  const missingDependencies =
    extensionsState.explicitlyActivatedExtensions.filter(
      (e) => extension.definition.dependencies[e.name] === undefined,
    );

  /**
   * Dependencies that do not satisfy the existing definition
   */
  const newVersionDependencies =
    extensionsState.explicitlyActivatedExtensions.filter(
      (e) =>
        extension.definition.dependencies[e.name] !== undefined &&
        !semver.satisfies(e.version, extension.definition.dependencies[e.name]),
    );

  /**
   * Collection of new dependencies and new versions of dependencies
   */
  const newDependencies = {
    ...retainedDependencies,
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

  const tree = new ExtensionDependencyTree(
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
}
