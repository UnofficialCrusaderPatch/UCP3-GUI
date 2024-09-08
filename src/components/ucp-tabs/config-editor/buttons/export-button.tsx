import { FolderSymlink } from 'react-bootstrap-icons';
import { useSetAtom } from 'jotai';
import { useCurrentGameFolder } from '../../../../function/game-folder/utils';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import { showModalOk } from '../../../modals/modal-ok';
import { makeToast } from '../../../toasts/toasts-display';
import exportButtonCallback from '../../common/export-button-callback';
import { Message } from '../../../../localization/localization';
import { useText } from '../../../general/text';

function ExportButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  const setConfigStatus = (msg: Message) => makeToast({ title: msg, body: '' });

  const gameFolder = useCurrentGameFolder();

  const localize = useText();

  return (
    <button
      className="ucp-button ucp-button--square text-light"
      type="button"
      onClick={async () => {
        try {
          exportButtonCallback(gameFolder, setConfigStatus, localize);
        } catch (e: unknown) {
          await showModalOk({
            title: 'ERROR',
            message: String(e),
          });
        }
      }}
      onMouseEnter={() => {
        setStatusBarMessage('config.tooltip.export');
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
