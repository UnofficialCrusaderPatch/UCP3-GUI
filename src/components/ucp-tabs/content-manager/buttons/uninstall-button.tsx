import { useAtomValue, useSetAtom } from 'jotai';
import { XSquare } from 'react-bootstrap-icons';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import {
  BUSY_CONTENT_ELEMENTS_ATOM,
  CONTENT_INTERFACE_STATE_ATOM,
  CONTENT_TAB_LOCK,
  EXTENSIONS_STATE_IS_DISK_DIRTY_ATOM,
} from '../state/atoms';
import { uninstallContents } from './callbacks/uninstall-content';
import { showModalOkCancel } from '../../../modals/modal-ok-cancel';
import Logger from '../../../../util/scripts/logging';
import { getStore } from '../../../../hooks/jotai/base';
import { ExtensionDependencyTree } from '../../../../function/extensions/dependency-management/dependency-resolution';
import {
  EXTENSIONS_ATOM,
  EXTENSIONS_STATE_TREE_ATOM,
} from '../../../../function/extensions/state/focus';

const LOGGER = new Logger('uninstall-button.tsx');

// eslint-disable-next-line import/prefer-default-export
export function UninstallButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  const interfaceState = useAtomValue(CONTENT_INTERFACE_STATE_ATOM);
  const selectionCount = interfaceState.selected.length;
  const installed = interfaceState.selected.filter((ce) => ce.installed);
  const installedCount = installed.length;
  const onlineOnlyCount = interfaceState.selected.filter(
    (ce) => !ce.installed && ce.online,
  ).length;
  const deprecated = interfaceState.selected.filter(
    (ce) => ce.installed && !ce.online,
  );

  const busyCount = useAtomValue(BUSY_CONTENT_ELEMENTS_ATOM).length;

  const countElement =
    selectionCount < 2 ? (
      <span />
    ) : (
      <span className="m-auto">( {selectionCount} )</span>
    );

  let enabled = true;
  /* todo:locale: */
  let helpText = 'Uninstall selected content';
  if (installedCount === 0) {
    enabled = false;
    /* todo:locale: */
    helpText = 'Select at least one extension to uninstall';
  } else if (onlineOnlyCount > 0) {
    enabled = false;
    /* todo:locale: */
    helpText = 'Cannot uninstall online content';
  } else if (busyCount > 0) {
    enabled = false;
    /* todo:locale: */
    helpText = `Cannot install content that is not idle. Please wait and then restart`;
  }

  return (
    <div
      onMouseEnter={() => {
        setStatusBarMessage(helpText);
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
      <button
        className="ucp-button ucp-button-variant"
        disabled={!enabled}
        type="button"
        onClick={async () => {
          getStore().set(
            CONTENT_TAB_LOCK,
            getStore().get(CONTENT_TAB_LOCK) + 1,
          );

          if (deprecated.length > 0) {
            const deprecationAnswer = await showModalOkCancel({
              /* todo:locale: */
              title: 'Permanent removal warning',
              message: `The following content has been removed from the online store, removal will be permanent, are you sure you want to continue?\n\n${deprecated.map((ce) => ce.definition.name).join('\n')}`,
            });

            if (!deprecationAnswer) {
              LOGGER.msg(`Aborted permanent removal`).debug();
              return;
            }
            LOGGER.msg(`Confirmed permanent removal`).debug();
          }

          if (busyCount > 0) {
            // TODO: fixed elsewhere
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
                CONTENT_TAB_LOCK,
                getStore().get(CONTENT_TAB_LOCK) - 1,
              );
              return;
            }
          }

          getStore().set(
            CONTENT_TAB_LOCK,
            getStore().get(CONTENT_TAB_LOCK) + installed.length - 1,
          );

          getStore().set(EXTENSIONS_STATE_IS_DISK_DIRTY_ATOM, true);
          await uninstallContents(installed);
        }}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...props}
      >
        <div className="ucp-button-variant-button-text d-flex align-items-center">
          <span className="ps-2">
            <XSquare />
          </span>
          <span className="ms-auto me-auto">Uninstall</span>
          {countElement}
        </div>
      </button>
    </div>
  );
}
