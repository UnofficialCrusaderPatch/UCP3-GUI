import { useAtomValue, useSetAtom } from 'jotai';
import { XSquare } from 'react-bootstrap-icons';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import {
  BUSY_CONTENT_ELEMENTS_ATOM,
  CONTENT_INTERFACE_STATE_ATOM,
} from '../state/atoms';
import Logger from '../../../../util/scripts/logging';
import { uninstallContentButtonCallback } from './callbacks/uninstall-button-callback';

export const LOGGER = new Logger('uninstall-button.tsx');

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
          await uninstallContentButtonCallback(installed, deprecated);
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
