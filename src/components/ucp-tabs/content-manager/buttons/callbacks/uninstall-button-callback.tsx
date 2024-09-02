import { ContentElement } from '../../../../../function/content/types/content-element';
import { ExtensionDependencyTree } from '../../../../../function/extensions/dependency-management/dependency-resolution';
import {
  EXTENSIONS_ATOM,
  EXTENSIONS_STATE_TREE_ATOM,
} from '../../../../../function/extensions/state/focus';
import { getStore } from '../../../../../hooks/jotai/base';
import Logger from '../../../../../util/scripts/logging';
import { showModalOk } from '../../../../modals/modal-ok';
import { showModalOkCancel } from '../../../../modals/modal-ok-cancel';
import {
  BUSY_CONTENT_COUNT,
  EXTENSIONS_STATE_IS_DISK_DIRTY_ATOM,
} from '../../state/atoms';
import { uninstallContents } from './uninstall-content';

export const LOGGER = new Logger('uninstall-button-callback.tsx');

// eslint-disable-next-line import/prefer-default-export
export async function uninstallContentButtonCallback(
  installed: ContentElement[],
  deprecated: ContentElement[],
) {
  function changeCount(value?: number) {
    const count = getStore().get(BUSY_CONTENT_COUNT);
    if (value === undefined) {
      getStore().set(BUSY_CONTENT_COUNT, count + 1);
    } else {
      getStore().set(BUSY_CONTENT_COUNT, count + value);
    }
  }

  try {
    changeCount(1);

    if (deprecated.length > 0) {
      const deprecationAnswer = await showModalOkCancel({
        /* todo:locale: */
        title: 'Permanent removal warning',

        /* todo:locale: */
        message: `The following content has been removed from the online store, removal will be permanent, are you sure you want to continue?\n\n${deprecated.map((ce) => ce.definition.name).join('\n')}`,
      });

      if (!deprecationAnswer) {
        LOGGER.msg(`Aborted permanent removal`).debug();
        return;
      }
      LOGGER.msg(`Confirmed permanent removal`).debug();
    }

    const extensions = getStore().get(EXTENSIONS_ATOM);
    const toBeRemovedExtensions = installed.map(
      (ce) =>
        extensions.filter(
          (ext) =>
            ext.name === ce.definition.name &&
            ext.version === ce.definition.version,
        )[0],
    );
    const leftOverExtensions = extensions.filter(
      (ext) => toBeRemovedExtensions.indexOf(ext) === -1,
    );
    const etree = getStore().get(EXTENSIONS_STATE_TREE_ATOM);
    const tree = new ExtensionDependencyTree(
      leftOverExtensions,
      etree.frontendVersion,
      etree.frameworkVersion,
    );

    const solution = tree.tryResolveAllDependencies();

    if (solution.status !== 'ok') {
      const okCancelResult = await showModalOkCancel({
        /* todo:locale: */
        title: 'Removal of dependencies',
        /* todo:locale: */
        message:
          'Deinstallation of the selected content will lead to unresolved dependencies.\n\nAre you sure you want to uninstall the selected?',
      });
      if (okCancelResult === false) {
        getStore().set(
          BUSY_CONTENT_COUNT,
          getStore().get(BUSY_CONTENT_COUNT) - 1,
        );
        return;
      }
    }

    changeCount(-1 + installed.length);

    getStore().set(EXTENSIONS_STATE_IS_DISK_DIRTY_ATOM, true);
    const results = await uninstallContents(installed, () => {
      changeCount(-1);
    });

    const report = results
      .filter((r) => r.status === 'error')
      .map(
        (r) =>
          /* todo:locale: */
          `Deinstallation of ${r.contentElement.definition.name} failed (${r.status}). Reason: ${r.message}`,
      )
      .join('\n');

    if (report.length > 0) {
      await showModalOk({
        /* todo:locale: */
        title: 'Deinstallation errors',
        /* todo:locale: */
        message: `There were one or more extensions which failed to uninstall:\n\n${report}`,
      });
    }
  } catch (err: any) {
    await showModalOk({
      /* todo:locale: */
      title: 'Uncaught exception',
      /* todo:locale: */
      message: `${err.toString()}`,
    });
  } finally {
    getStore().set(BUSY_CONTENT_COUNT, 0);
  }
}
