import { useAtom, useSetAtom } from 'jotai';
import { Funnel, FunnelFill } from 'react-bootstrap-icons';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import { STORE_SHOW_ALL_EXTENSION_TYPES_ATOM } from '../../../../function/gui-settings/settings';

// eslint-disable-next-line import/prefer-default-export
export function ExtensionFilterButton() {
  const [f, setF] = useAtom(STORE_SHOW_ALL_EXTENSION_TYPES_ATOM);

  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);
  return (
    <button
      type="button"
      className="ucp-button ucp-button--square text-light"
      onClick={() => {
        if (f.indexOf('module') !== -1) {
          setF(['plugin']);
        } else {
          setF(['module', 'plugin']);
        }
      }}
      onMouseEnter={() => {
        /* todo:locale: */
        setStatusBarMessage('store.filter.condensed');
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
      {f.indexOf('module') === -1 ? <FunnelFill /> : <Funnel />}
    </button>
  );
}
