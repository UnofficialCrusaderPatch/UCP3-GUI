import { t } from 'i18next';
import { useSetAtom } from 'jotai';
import { Folder } from 'react-bootstrap-icons';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import { showModalOk } from '../../../modals/modal-ok';
import { makeToast } from '../../../toasts/toasts-display';
import { useCurrentGameFolder } from '../../../../function/game-folder/utils';
import importButtonCallback from '../../common/import-button-callback';

function ImportButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  const setConfigStatus = (msg: string) => makeToast({ title: msg, body: '' });

  const gameFolder = useCurrentGameFolder();
  return (
    <button
      className="ucp-button ucp-button--square text-light"
      type="button"
      onClick={async () => {
        try {
          importButtonCallback(gameFolder, setConfigStatus, t, '');
        } catch (e: any) {
          await showModalOk({
            title: 'ERROR',
            message: e.toString(),
          });
        }
      }}
      onMouseEnter={() => {
        setStatusBarMessage(t('gui-editor:config.tooltip.import'));
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    >
      <Folder />
    </button>
  );
}

export default ImportButton;
