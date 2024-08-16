import { useAtomValue, useSetAtom } from 'jotai';
import { Download } from 'react-bootstrap-icons';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import {
  BUSY_CONTENT_ELEMENTS_ATOM,
  CONTENT_ELEMENTS_ATOM,
  CONTENT_INTERFACE_STATE_ATOM,
  CONTENT_TAB_LOCK,
  EXTENSIONS_STATE_IS_DISK_DIRTY_ATOM,
} from '../state/atoms';
import { downloadContent } from './callbacks/download-and-install-content';
import { CONTENT_TREE_ATOM } from './callbacks/dependency-management';
import { showModalOk } from '../../../modals/modal-ok';
import { getStore } from '../../../../hooks/jotai/base';

// eslint-disable-next-line import/prefer-default-export
export function InstallButton(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  const interfaceState = useAtomValue(CONTENT_INTERFACE_STATE_ATOM);

  const contentElements = useAtomValue(CONTENT_ELEMENTS_ATOM);

  const selectionCount = interfaceState.selected.length;

  const countElement =
    selectionCount < 2 ? (
      <span />
    ) : (
      <span className="m-auto">( {selectionCount} )</span>
    );

  const installedCount = interfaceState.selected.filter(
    (ce) => ce.installed,
  ).length;
  const onlineOnlyCount = interfaceState.selected.filter(
    (ce) => !ce.installed && ce.online,
  ).length;
  const busyCount = useAtomValue(BUSY_CONTENT_ELEMENTS_ATOM).length;

  let enabled = true;
  let helpText = 'Install selected content';
  if (installedCount > 0) {
    enabled = false;
    helpText = 'Selection includes already installed content';
  } else if (onlineOnlyCount === 0) {
    enabled = false;
    helpText = 'Select at least one content element';
  } else if (busyCount > 0) {
    enabled = false;
    helpText =
      'Cannot install content when other content is processing. Please wait first';
  }

  const tree = useAtomValue(CONTENT_TREE_ATOM);

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
        disabled={tree === undefined || !enabled}
        type="button"
        onClick={async () => {
          getStore().set(
            CONTENT_TAB_LOCK,
            getStore().get(CONTENT_TAB_LOCK) + 1,
          );

          const ids = interfaceState.selected.map(
            (ec) => `${ec.definition.name}@${ec.definition.version}`,
          );

          const solution = tree!.dependenciesForMultiple(ids);

          if (solution.status !== 'OK') {
            await showModalOk({
              title: 'Cannot install',
              message: solution.message,
            });
            return;
          }

          const solutionIDs = solution.packages.map((p) => p.id);

          const notInstalledDependencies = contentElements
            // Retain elements that are in the solution
            .filter(
              (ce) =>
                solutionIDs.indexOf(
                  `${ce.definition.name}@${ce.definition.version}`,
                ) !== -1,
            )
            // Retain elements that are not installed yet
            .filter((ce) => !ce.installed);

          getStore().set(
            CONTENT_TAB_LOCK,
            getStore().get(CONTENT_TAB_LOCK) +
              notInstalledDependencies.length -
              1,
          );

          getStore().set(EXTENSIONS_STATE_IS_DISK_DIRTY_ATOM, true);
          await downloadContent(notInstalledDependencies);
        }}
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...props}
      >
        <div className="ucp-button-variant-button-text d-flex align-items-center">
          <span className="ps-2">
            <Download />
          </span>
          <span className="ms-auto me-auto">Install</span>
          {countElement}
        </div>
      </button>
    </div>
  );
}
