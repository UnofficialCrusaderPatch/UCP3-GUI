import { useAtom, useSetAtom } from 'jotai';
import { Funnel, FunnelFill } from 'react-bootstrap-icons';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import * as GuiSettings from '../../../../function/gui-settings/settings';

// eslint-disable-next-line import/prefer-default-export
export function FilterButton() {
  const [showAllExtensions, setShowAllExtensions] = useAtom(
    GuiSettings.SHOW_ALL_EXTENSIONS_ATOM,
  );

  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);
  return (
    <button
      type="button"
      className="ucp-button ucp-button--square text-light"
      onClick={() => {
        setShowAllExtensions(!showAllExtensions);
      }}
      onMouseEnter={() => {
        setStatusBarMessage('config.tooltip.filter');
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
      {showAllExtensions ? <Funnel /> : <FunnelFill />}
    </button>
  );
}
