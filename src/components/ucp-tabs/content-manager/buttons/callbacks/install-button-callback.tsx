import { ContentInterfaceState } from '../../../../../function/content/state/content-interface-state';
import { ContentElement } from '../../../../../function/content/types/content-element';
import { DependencyTree } from '../../../../../function/extensions/dependency-management/dependency-resolution';
import { createExtensionID } from '../../../../../function/global/constants/extension-id';
import { getStore } from '../../../../../hooks/jotai/base';
import { showModalOk } from '../../../../modals/modal-ok';
import {
  BUSY_CONTENT_COUNT,
  EXTENSIONS_STATE_IS_DISK_DIRTY_ATOM,
} from '../../state/atoms';
import { installOnlineContent } from './install-content';

// eslint-disable-next-line import/prefer-default-export
export async function installContentButtonCallback(
  interfaceState: ContentInterfaceState,
  contentElements: ContentElement[],
  tree: DependencyTree | undefined,
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
    // Lock the content tab, as we have to wait for
    // download and installation to be finished
    changeCount(1);

    const ids = interfaceState.selected.map((ec) => createExtensionID(ec));

    const solution = tree!.dependenciesForMultiple(ids);

    if (solution.status !== 'OK') {
      await showModalOk({
        /* todo:locale: */
        title: 'Cannot install',

        /* todo:locale: */
        message: solution.message,
      });
      return;
    }

    const solutionIDs = solution.packages.map((p) => p.id);

    const notInstalledDependencies = contentElements
      // Retain elements that are in the solution
      .filter((ce) => solutionIDs.indexOf(createExtensionID(ce)) !== -1)
      // Retain elements that are not installed yet
      .filter((ce) => !ce.installed);

    // This corrects for the +1 we cheated in earlier
    changeCount(-1 + notInstalledDependencies.length);

    getStore().set(EXTENSIONS_STATE_IS_DISK_DIRTY_ATOM, true);
    const results = await installOnlineContent(notInstalledDependencies, () => {
      changeCount(-1);
    });

    const report = results
      .filter((r) => r.status !== 'ok')
      .map(
        (r) =>
          /* todo:locale: */
          `Installation of ${r.contentElement.definition.name} failed (${r.status}). Reason: ${r.message}`,
      )
      .join('\n');

    if (report.length > 0) {
      await showModalOk({
        /* todo:locale: */
        title: 'Installation errors',
        /* todo:locale: */
        message: `There were one or more extensions which failed to install:\n\n${report}`,
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
