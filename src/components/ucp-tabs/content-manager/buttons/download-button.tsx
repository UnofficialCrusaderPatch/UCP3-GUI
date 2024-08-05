import { atom, useAtomValue, useSetAtom } from 'jotai';
import { Download } from 'react-bootstrap-icons';
import { useMemo } from 'react';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import {
  CONTENT_ELEMENTS_ATOM,
  CONTENT_INTERFACE_STATE_ATOM,
  contentInstallationStatusAtoms,
} from '../state/atoms';
import { downloadContent } from './callbacks/download-and-install-content';
import { CONTENT_TREE_ATOM } from './callbacks/dependency-management';
import { showModalOk } from '../../../modals/modal-ok';

// eslint-disable-next-line import/prefer-default-export
export function DownloadButton(
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

  const selectedIDsAtom = useMemo(
    () =>
      atom(() =>
        interfaceState.selected.map(
          (ce) => `${ce.definition.name}@${ce.definition.version}`,
        ),
      ),
    [interfaceState.selected],
  );
  const selectedIDs = useAtomValue(selectedIDsAtom);
  const installedCount = interfaceState.selected.filter(
    (ce) => ce.installed,
  ).length;
  const onlineOnlyCount = interfaceState.selected.filter(
    (ce) => !ce.installed && ce.online,
  ).length;
  const busyCountAtom = useMemo(
    () =>
      atom(
        (get) =>
          Object.entries(contentInstallationStatusAtoms).filter(
            ([id, at]) =>
              selectedIDs.indexOf(id) !== -1 && get(at).action !== 'idle',
          ).length,
      ),
    [selectedIDs],
  );
  const busyCount = useAtomValue(busyCountAtom);

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
      'Cannot install content that is not idle. Please wait and restart first';
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
          downloadContent(notInstalledDependencies);
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
