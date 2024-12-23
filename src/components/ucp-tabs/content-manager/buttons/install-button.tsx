import { useAtomValue, useSetAtom } from 'jotai';
import { Download } from 'react-bootstrap-icons';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import {
  BUSY_CONTENT_ELEMENTS_ATOM,
  CONTENT_ELEMENTS_ATOM,
  CONTENT_INTERFACE_STATE_ATOM,
} from '../state/atoms';
import { CONTENT_TREE_ATOM } from './callbacks/dependency-management';
import { installContentButtonCallback } from './callbacks/install-button-callback';
import Message, { useMessage } from '../../../general/message';

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

  const localize = useMessage();
  let enabled = true;
  /* todo:locale: */
  let helpText = localize('store.toolbar.install.selected');
  if (installedCount > 0) {
    enabled = false;
    /* todo:locale: */
    helpText = localize('store.toolbar.install.cannot');
  } else if (onlineOnlyCount === 0) {
    enabled = false;
    /* todo:locale: */
    helpText = localize('store.toolbar.install.noselection');
  } else if (busyCount > 0) {
    enabled = false;
    /* todo:locale: */
    helpText = localize('store.toolbar.install.notidle');
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
        onClick={async () =>
          installContentButtonCallback(interfaceState, contentElements, tree!)
        }
        // eslint-disable-next-line react/jsx-props-no-spreading
        {...props}
      >
        <div className="ucp-button-variant-button-text d-flex align-items-center">
          <span className="ps-2">
            <Download />
          </span>
          <span className="ms-auto me-auto">
            <Message message="store.toolbar.install" />
          </span>
          {countElement}
        </div>
      </button>
    </div>
  );
}
