import { atom, useAtom, useSetAtom } from 'jotai';
import { Funnel, FunnelFill } from 'react-bootstrap-icons';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';

export const UI_FILTER_SETTING_ATOM = atom(true);

// eslint-disable-next-line import/prefer-default-export
export function ContentFilterButton() {
  const [showOnlineContentOnly, setShowOnlineContentOnly] = useAtom(
    UI_FILTER_SETTING_ATOM,
  );

  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);
  return (
    <button
      type="button"
      className="ucp-button ucp-button--square text-light"
      onClick={() => {
        setShowOnlineContentOnly(!showOnlineContentOnly);
      }}
      onMouseEnter={() => {
        setStatusBarMessage('Show / hide installed content');
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
      {showOnlineContentOnly ? <FunnelFill /> : <Funnel />}
    </button>
  );
}
