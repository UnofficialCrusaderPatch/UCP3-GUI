import { GENERAL_OKCANCEL_MODAL_WINDOW_REDUCER_ATOM } from 'function/global/global-atoms';
import { GeneralOkCancelModalWindow } from 'function/global/types';
import { getStore } from 'hooks/jotai/base';
import { useGeneralOkayCancelModalWindowReducer } from 'hooks/jotai/globals-wrapper';
import { Modal, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

export const DEFAULT_OK_CANCEL_MODAL_WINDOW: GeneralOkCancelModalWindow = {
  type: 'ok_cancel',
  show: false,
  message: '',
  title: '',
  handleAction: () => {},
  handleClose: () => {},
  ok: '',
  cancel: '',
};

function setGeneralOkCancelModalWindow(state: GeneralOkCancelModalWindow) {
  getStore().set(GENERAL_OKCANCEL_MODAL_WINDOW_REDUCER_ATOM, state);
}

export async function showGeneralModalOkCancel(
  spec: Partial<GeneralOkCancelModalWindow>
) {
  const fullSpec: GeneralOkCancelModalWindow = {
    ...DEFAULT_OK_CANCEL_MODAL_WINDOW,
    ...spec,
  };

  return new Promise<boolean>((resolve) => {
    setGeneralOkCancelModalWindow({
      ...fullSpec,
      show: true,
      handleAction: () => {
        fullSpec.handleAction();
        resolve(true);
      },
      handleClose: () => {
        fullSpec.handleClose();
        resolve(false);
      },
    });
  });
}

// eslint-disable-next-line import/prefer-default-export
export function ModalOkCancel() {
  const [generalModalWindow, setGeneralModalWindow] =
    useGeneralOkayCancelModalWindowReducer();

  const { handleClose, handleAction, title, message, show } =
    generalModalWindow;

  const { t } = useTranslation(['gui-general', 'gui-editor', 'gui-download']);

  return (
    <>
      {/* General modal popup window */}
      <div className="m-5">
        <Modal
          show={show}
          onHide={() => {
            setGeneralModalWindow({ ...generalModalWindow, show: false });
            handleClose();
          }}
          className="text-dark"
          style={{ whiteSpace: 'pre-line' }}
        >
          <Modal.Header closeButton>
            <Modal.Title>{title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>{message}</Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() =>
                new Promise<void>((resolve) => {
                  setGeneralModalWindow({ ...generalModalWindow, show: false });
                  handleClose();
                  resolve();
                })
              }
            >
              {generalModalWindow.cancel !== undefined &&
              generalModalWindow.cancel.length > 0
                ? generalModalWindow.cancel
                : t('gui-general:cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={() =>
                new Promise<void>((resolve) => {
                  setGeneralModalWindow({ ...generalModalWindow, show: false });
                  handleAction();
                  resolve();
                })
              }
            >
              {generalModalWindow.ok !== undefined &&
              generalModalWindow.ok.length > 0
                ? generalModalWindow.ok
                : t('gui-general:ok')}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </>
  );
}
