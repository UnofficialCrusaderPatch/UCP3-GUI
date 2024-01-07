import { t } from 'i18next';
import { FolderSymlink } from 'react-bootstrap-icons';
import { useSetAtom } from 'jotai';
import { useCurrentGameFolder } from '../../../../function/game-folder/state';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import { showModalOk } from '../../../modals/modal-ok';
import { makeToast } from '../../../modals/toasts/ToastsDisplay';
import exportButtonCallback from '../../common/ExportButtonCallback';

function ExportButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  const setConfigStatus = (msg: string) => makeToast({ title: msg, body: '' });

  const gameFolder = useCurrentGameFolder();

  return (
    <button
      className="ucp-button ucp-button--square text-light"
      type="button"
      onClick={async () => {
        try {
          exportButtonCallback(gameFolder, setConfigStatus, t);
        } catch (e: any) {
          await showModalOk({
            title: 'ERROR',
            message: e.toString(),
          });
        }
      }}
      onMouseEnter={() => {
        setStatusBarMessage(t('gui-editor:config.tooltip.export'));
      }}
      onMouseLeave={() => {
        setStatusBarMessage(undefined);
      }}
      // eslint-disable-next-line react/jsx-props-no-spreading
      {...props}
    >
      <FolderSymlink />
    </button>
  );
}

export default ExportButton;
