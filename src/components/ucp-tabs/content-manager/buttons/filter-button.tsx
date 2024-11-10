import { atom, useAtom, useSetAtom } from 'jotai';
import { Globe2 } from 'react-bootstrap-icons';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';

export const UI_FILTER_SETTING_ATOM = atom(true);

/**
 * ContentFilterButton is the internet only filter button
 * @returns ContentFilterButton
 */
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
        /* todo:locale: */
        setStatusBarMessage('store.filter.installed');
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
      {showOnlineContentOnly ? (
        <Globe2 />
      ) : (
        <Globe2 style={{ opacity: 0.25 }} />
      )}
    </button>
  );
}
