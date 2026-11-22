import { createStore } from 'jotai';
import { ContentElement } from '../../../../../function/content/types/content-element';
import { ExtensionDependencyTree } from '../../../../../function/extensions/dependency-management/dependency-resolution';
import {
  planUninstall,
  uninstallErrors,
} from '../../../../../function/extensions/dependency-management/uninstall';
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
import { confirmUninstall } from './uninstall-review';
import { installableSources } from './install-content';
import { loadConfigFromFile } from '../../../../../config/ucp/config-files/config-files';
import { deserializeLoadOrder } from '../../../../../config/ucp/config-files/load-order';
import { onFsExists } from '../../../../../tauri/tauri-files';
import { reloadCurrentGameFolder } from '../../../../../function/game-folder/modifications/reload-current-game-folder';

/**
 * Extension IDs the profile file on disk refers to. The disk-state atom can describe
 * an imported but unapplied setup, so the file itself decides whether it must be saved
 * before a package it uses is deleted. An unreadable profile counts as using everything.
 */
async function profileExtensionIDs(file: string, ids: string[]) {
  if (!(await onFsExists(file))) return new Set<string>();
  const loaded = await loadConfigFromFile(file);
  if (loaded.status !== 'OK') return new Set(ids);
  const orders = [
    loaded.result['config-full']?.['load-order'],
    loaded.result['config-sparse']?.['load-order'],
  ];
  try {
    return new Set(
      orders
        .filter((order) => order !== undefined)
        .flatMap((order) => deserializeLoadOrder(order!))
        .map(({ extension, version }) => `${extension}@${version}`),
    );
  } catch {
    return new Set(ids);
  }
}

// eslint-disable-next-line import/prefer-default-export
export async function uninstallContentButtonCallback(
  installed: ContentElement[],
  deprecated: ContentElement[],
) {
  const store = getStore();
  if (store.get(BUSY_CONTENT_COUNT) > 0 || installed.length === 0) return;
  store.set(BUSY_CONTENT_COUNT, 1);
  let reload = false;
  try {
    // Packages installed or removed since the last load are not in the extension
    // state yet, so a removal preview could miss a new dependent. Reload first.
    if (store.get(EXTENSIONS_STATE_IS_DISK_DIRTY_ATOM)) {
      reload = await showModalOkCancel({
        title: 'extensions.reload.required.title',
        message: 'extensions.reload.required.message',
      });
      return;
    }
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
    const selectedIds = installed.map(createExtensionID);
    const plan = planUninstall(before, selectedIds);
    if (plan.errors.length) {
      await showModalOk({
        title: 'content.uninstallation.dependencies.error.title',
        message: {
          key: 'content.uninstallation.dependencies.error.message',
          args: { lst: plan.errors.join('\n') },
        },
      });
      return;
    }
    // A removed exact version stays recoverable for saved setups while the Store offers it.
    const isOffline = (ce: ContentElement) =>
      !ce.online ||
      deprecated.some(
        (entry) => createExtensionID(entry) === createExtensionID(ce),
      );
    const findInstalled = (id: string) =>
      [...installed, ...store.get(CONTENT_ELEMENTS_ATOM)].find(
        (entry) => entry.installed && createExtensionID(entry) === id,
      );
    const confirmed = await confirmUninstall(
      plan,
      planUninstall(before, selectedIds, true),
      (ext) => {
        const ce = findInstalled(createExtensionID(ext));
        return (
          ce !== undefined &&
          !isOffline(ce) &&
          installableSources(ce).length > 0
        );
      },
    );
    if (!confirmed) return;
    if (!unchanged()) throw Error('content.uninstallation.changed');
    const extensions = [
      ...confirmed.selected,
      ...confirmed.dependents,
      ...confirmed.unused,
    ];
    const ids = extensions.map(createExtensionID);
    const removalContent = extensions.map((ext) => {
      const ce = findInstalled(createExtensionID(ext));
      if (!ce) throw Error('content.uninstallation.changed');
      return ce;
    });
    const offline = removalContent.filter(isOffline);
    if (
      offline.length &&
      !(await showModalOkCancel({
        title: 'content.uninstallation.permanent.warning.title',
        message: {
          key: 'content.uninstallation.permanent.warning.message',
          args: { lst: offline.map(createExtensionID).join('\n') },
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
    const onDisk = file
      ? await profileExtensionIDs(file, ids)
      : new Set<string>();
    const needsSave =
      [...before.activeExtensions, ...disk].some((ext) =>
        ids.includes(createExtensionID(ext)),
      ) ||
      ids.some((id) => onDisk.has(id)) ||
      prepared.disappearingEntries.length > 0;
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
      if (!unchanged()) {
        // The file now holds the staged setup even though nothing is deleted.
        store.set(CONFIGURATION_DISK_STATE_ATOM, [
          ...prepared.state.activeExtensions,
        ]);
        store.set(CONFIG_EXTENSIONS_DIRTY_STATE_ATOM, true);
        throw Error('content.uninstallation.changed');
      }
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
    const pending = [...removalContent];
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
  if (reload) reloadCurrentGameFolder();
}
