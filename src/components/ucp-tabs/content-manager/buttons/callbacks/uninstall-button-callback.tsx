import { createStore } from 'jotai';
import { ContentElement } from '../../../../../function/content/types/content-element';
import { ExtensionDependencyTree } from '../../../../../function/extensions/dependency-management/dependency-resolution';
import { uninstallErrors } from '../../../../../function/extensions/dependency-management/uninstall';
import { EXTENSION_STATE_INTERFACE_ATOM } from '../../../../../function/extensions/state/state';
import { CONFIGURATION_DISK_STATE_ATOM } from '../../../../../function/extensions/state/disk';
import {
  CONFIGURATION_FULL_REDUCER_ATOM,
  CONFIGURATION_USER_REDUCER_ATOM,
  CONFIGURATION_QUALIFIER_REDUCER_ATOM,
  CONFIGURATION_TOUCHED_REDUCER_ATOM,
  UCP_CONFIG_FILE_ATOM,
} from '../../../../../function/configuration/state';
import { saveUCPConfig } from '../../../../../config/ucp/config-files/config-files';
import { createExtensionID } from '../../../../../function/global/constants/extension-id';
import { getStore } from '../../../../../hooks/jotai/base';
import { showModalOk } from '../../../../modals/modal-ok';
import { showModalOkCancel } from '../../../../modals/modal-ok-cancel';
import { prepareExtensionDeactivation } from '../../../extension-manager/extension-elements/active-extension-element-click-callback';
import { filterOutExtensions } from '../../../extension-manager/extension-elements/filter-out-extensions';
import { EXTENSION_EDITOR_STATE_ATOM } from '../../../common/extension-editor/extension-editor-state';
import { CONFIG_EXTENSIONS_DIRTY_STATE_ATOM } from '../../../common/buttons/config-serialized-state';
import {
  BUSY_CONTENT_COUNT,
  CONTENT_ELEMENTS_ATOM,
  CONTENT_INTERFACE_STATE_ATOM,
  LAST_CLICKED_CONTENT_ATOM,
  EXTENSIONS_STATE_IS_DISK_DIRTY_ATOM,
} from '../../state/atoms';
import { uninstallContents } from './uninstall-content';

// eslint-disable-next-line import/prefer-default-export
export async function uninstallContentButtonCallback(
  installed: ContentElement[],
  deprecated: ContentElement[],
) {
  const store = getStore();
  if (store.get(BUSY_CONTENT_COUNT) > 0 || installed.length === 0) return;
  store.set(BUSY_CONTENT_COUNT, 1);
  try {
    const before = store.get(EXTENSION_STATE_INTERFACE_ATOM);
    const user = store.get(CONFIGURATION_USER_REDUCER_ATOM);
    const qualifiers = store.get(CONFIGURATION_QUALIFIER_REDUCER_ATOM);
    const touched = store.get(CONFIGURATION_TOUCHED_REDUCER_ATOM);
    const disk = store.get(CONFIGURATION_DISK_STATE_ATOM);
    const file = store.get(UCP_CONFIG_FILE_ATOM);
    const unchanged = () =>
      store.get(EXTENSION_STATE_INTERFACE_ATOM) === before &&
      store.get(CONFIGURATION_USER_REDUCER_ATOM) === user &&
      store.get(CONFIGURATION_QUALIFIER_REDUCER_ATOM) === qualifiers &&
      store.get(CONFIGURATION_TOUCHED_REDUCER_ATOM) === touched &&
      store.get(CONFIGURATION_DISK_STATE_ATOM) === disk &&
      store.get(UCP_CONFIG_FILE_ATOM) === file;
    if (store.get(EXTENSION_EDITOR_STATE_ATOM).state !== 'inactive') {
      await showModalOk({
        title: 'error.capitalized',
        message: 'content.uninstallation.editor',
      });
      return;
    }
    const ids = installed.map(createExtensionID);
    const extensions = before.extensions.filter((ext) =>
      ids.includes(createExtensionID(ext)),
    );
    if (extensions.length !== new Set(ids).size)
      throw Error('content.uninstallation.changed');
    const errors = uninstallErrors(before, ids);
    if (errors.length) {
      await showModalOk({
        title: 'content.uninstallation.dependencies.error.title',
        message: {
          key: 'content.uninstallation.dependencies.error.message',
          args: { lst: errors.join('\n') },
        },
      });
      return;
    }
    if (
      deprecated.length &&
      !(await showModalOkCancel({
        title: 'content.uninstallation.permanent.warning.title',
        message: {
          key: 'content.uninstallation.permanent.warning.message',
          args: { lst: deprecated.map(createExtensionID).join('\n') },
        },
      }))
    )
      return;

    const prepared = prepareExtensionDeactivation(before, extensions, user);
    if (prepared.state.configuration.statusCode === 2) {
      await showModalOk({
        title: 'error.capitalized',
        message: prepared.state.configuration.errors.join('\n'),
      });
      return;
    }
    const needsSave =
      [...before.activeExtensions, ...disk].some((ext) =>
        ids.includes(createExtensionID(ext)),
      ) || prepared.disappearingEntries.length > 0;
    if (
      needsSave &&
      !(await showModalOkCancel({
        title: 'content.uninstallation.deactivate.title',
        message: {
          key: 'content.uninstallation.deactivate.message',
          args: {
            lst: ids.join('\n'),
            entries: prepared.disappearingEntries.join('\n') || '—',
          },
        },
      }))
    )
      return;
    if (!unchanged()) throw Error('content.uninstallation.changed');
    if (needsSave) {
      // Stage through the same atoms as ordinary Apply: merge/required-setting rules remain authoritative.
      const staged = createStore();
      staged.set(CONFIGURATION_USER_REDUCER_ATOM, {
        type: 'reset',
        value: prepared.user,
      });
      staged.set(EXTENSION_STATE_INTERFACE_ATOM, prepared.state);
      const nextQualifiers = filterOutExtensions(
        qualifiers,
        prepared.removedExtensions,
      );
      if (!file) throw Error('content.uninstallation.noconfig');
      await saveUCPConfig(
        prepared.user,
        staged.get(CONFIGURATION_FULL_REDUCER_ATOM),
        [...prepared.state.explicitlyActivatedExtensions].reverse(),
        [...prepared.state.activeExtensions].reverse(),
        file,
        nextQualifiers,
      );
      if (!unchanged()) throw Error('content.uninstallation.changed');
      store.set(CONFIGURATION_USER_REDUCER_ATOM, {
        type: 'reset',
        value: prepared.user,
      });
      store.set(CONFIGURATION_QUALIFIER_REDUCER_ATOM, {
        type: 'reset',
        value: nextQualifiers,
      });
      store.set(EXTENSION_STATE_INTERFACE_ATOM, prepared.state);
      store.set(CONFIGURATION_DISK_STATE_ATOM, [
        ...prepared.state.activeExtensions,
      ]);
      store.set(CONFIGURATION_TOUCHED_REDUCER_ATOM, {
        type: 'reset',
        value: {},
      });
      store.set(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM, false);
    }

    let expected = store.get(EXTENSION_STATE_INTERFACE_ATOM);
    const pending = [...installed];
    const failures: string[] = [];
    const removed = new Set<string>();
    // Remove dependents before providers. Rechecking each step also protects providers
    // when a dependent's file deletion fails, without a separate ordering/resolution algorithm.
    while (pending.length) {
      if (
        store.get(EXTENSION_STATE_INTERFACE_ATOM) !== expected ||
        store.get(UCP_CONFIG_FILE_ATOM) !== file
      )
        throw Error('content.uninstallation.changed');
      const currentState = expected;
      const index = pending.findIndex(
        (ce) =>
          uninstallErrors(currentState, [createExtensionID(ce)]).length === 0,
      );
      if (index < 0) {
        failures.push(
          ...pending.map(
            (ce) =>
              `${createExtensionID(ce)}: ${uninstallErrors(currentState, [createExtensionID(ce)]).join('\n')}`,
          ),
        );
        break;
      }
      const [ce] = pending.splice(index, 1);
      const remaining = expected.extensions.filter(
        (ext) => createExtensionID(ext) !== createExtensionID(ce),
      );
      const tree = new ExtensionDependencyTree(
        remaining,
        expected.tree.frontendVersion,
        expected.tree.frameworkVersion,
      );
      const solution = tree.extensionDependenciesForExtensions(
        expected.activeExtensions,
      );
      if (solution.status !== 'OK') throw Error(solution.message);
      store.set(EXTENSIONS_STATE_IS_DISK_DIRTY_ATOM, true);
      // eslint-disable-next-line no-await-in-loop
      const [result] = await uninstallContents([ce]);
      if (
        store.get(EXTENSION_STATE_INTERFACE_ATOM) !== expected ||
        store.get(UCP_CONFIG_FILE_ATOM) !== file
      )
        throw Error('content.uninstallation.changed');
      if (result.status !== 'ok') {
        failures.push(`${createExtensionID(ce)}: ${result.message}`);
      } else {
        removed.add(createExtensionID(ce));
        store.set(EXTENSION_STATE_INTERFACE_ATOM, {
          ...expected,
          extensions: remaining,
          installedExtensions: expected.installedExtensions.filter(
            (ext) => createExtensionID(ext) !== createExtensionID(ce),
          ),
          tree,
        });
        expected = store.get(EXTENSION_STATE_INTERFACE_ATOM);
      }
    }
    const content = store.get(CONTENT_ELEMENTS_ATOM);
    const selection = store.get(CONTENT_INTERFACE_STATE_ATOM);
    store.set(CONTENT_INTERFACE_STATE_ATOM, {
      ...selection,
      selected: content.filter(
        (ce) =>
          selection.selected.some(
            (selected) => createExtensionID(selected) === createExtensionID(ce),
          ) && !removed.has(createExtensionID(ce)),
      ),
    });
    const lastClicked = store.get(LAST_CLICKED_CONTENT_ATOM);
    if (lastClicked && removed.has(createExtensionID(lastClicked)))
      store.set(
        LAST_CLICKED_CONTENT_ATOM,
        content.find(
          (ce) => createExtensionID(ce) === createExtensionID(lastClicked),
        ),
      );
    if (failures.length)
      await showModalOk({
        title: 'content.uninstallation.errors.title',
        message: {
          key: 'content.uninstallation.errors.message',
          args: { report: failures.join('\n\n') },
        },
      });
  } catch (error: unknown) {
    await showModalOk({
      title: 'error.capitalized',
      message: error instanceof Error ? error.message : String(error),
    });
  } finally {
    store.set(BUSY_CONTENT_COUNT, 0);
  }
}
