import { useAtomValue, useSetAtom } from 'jotai';
import { Download } from 'react-bootstrap-icons';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import {
  CONTENT_ELEMENTS_ATOM,
  CONTENT_INTERFACE_STATE_ATOM,
} from '../state/atoms';
import { downloadContent } from './callbacks/download-content';
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

  const tree = useAtomValue(CONTENT_TREE_ATOM);

  return (
    <button
      className="ucp-button ucp-button-variant"
      disabled={tree === undefined || selectionCount === 0}
      type="button"
      onMouseEnter={() => {
        setStatusBarMessage('Download selected content and dependencies');
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
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
  );
}
