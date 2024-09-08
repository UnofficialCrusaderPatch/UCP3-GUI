import { useSetAtom } from 'jotai';
import { Folder } from 'react-bootstrap-icons';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import { showModalOk } from '../../../modals/modal-ok';
import { makeToast } from '../../../toasts/toasts-display';
import { useCurrentGameFolder } from '../../../../function/game-folder/utils';
import importButtonCallback from '../../common/importing/import-button-callback';
import { Message } from '../../../../localization/localization';
import { useText } from '../../../general/text';

function ImportButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  const setConfigStatus = (msg: Message) => makeToast({ title: msg, body: '' });

  const localize = useText();

  const gameFolder = useCurrentGameFolder();
  return (
    <button
      className="ucp-button ucp-button--square text-light"
      type="button"
      onClick={async () => {
        try {
          await importButtonCallback(gameFolder, setConfigStatus, localize, '');
        } catch (e: unknown) {
          await showModalOk({
            title: 'ERROR',
            message: String(e),
          });
        }
      }}
      onMouseEnter={() => {
        setStatusBarMessage('config.tooltip.import');
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
