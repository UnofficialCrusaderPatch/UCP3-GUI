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
import { ErrorContentMutationResult } from '../../types/content-store-mutation-result';
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
        title: 'content.uninstallation.permanent.warning.title',

        /* todo:locale: */
        message: {
          key: 'content.uninstallation.permanent.warning.message',
          args: {
            lst: `${deprecated.map((ce) => ce.definition.name).join('\n')}`,
          },
        },
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
      const reqs = solution.messages
        .map((m) => m.split('required by ')[1].split(')')[0])
        .flat();
      await showModalOk({
        /* todo:locale: */
        title: 'content.uninstallation.dependencies.error.title',
        /* todo:locale: */
        message: {
          key: 'content.uninstallation.dependencies.error.message',
          args: {
            lst: `${reqs.join('\n')}`,
          },
        },
      });
      return;
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
          `Deinstallation of ${r.contentElement.definition.name} failed (${r.status}). Reason: ${(r as ErrorContentMutationResult).message}`,
      )
      .join('\n');

    if (report.length > 0) {
      await showModalOk({
        /* todo:locale: */
        title: 'content.uninstallation.errors.title',
        /* todo:locale: */
        message: {
          key: 'content.uninstallation.errors.message',
          args: {
            report,
          },
        },
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
