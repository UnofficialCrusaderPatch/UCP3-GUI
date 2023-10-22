import { GENERAL_OK_MODAL_WINDOW_REDUCER_ATOM } from 'function/global/global-atoms';
import { GeneralOkModalWindow } from 'function/global/types';
import { getStore } from 'hooks/jotai/base';
import { useGeneralOkModalWindowReducer } from 'hooks/jotai/globals-wrapper';
import { Modal, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

export const DEFAULT_OK_CANCEL_MODAL_WINDOW: GeneralOkModalWindow = {
  type: 'ok',
  show: false,
  message: '',
  title: '',
  handleAction: () => {},
  ok: '',
};

function setGeneralOkModalWindow(state: GeneralOkModalWindow) {
  getStore().set(GENERAL_OK_MODAL_WINDOW_REDUCER_ATOM, state);
}

export async function showGeneralModalOk(spec: Partial<GeneralOkModalWindow>) {
  const fullSpec: GeneralOkModalWindow = {
    ...DEFAULT_OK_CANCEL_MODAL_WINDOW,
    ...spec,
  };

  return new Promise<boolean>((resolve) => {
    setGeneralOkModalWindow({
      ...fullSpec,
      show: true,
      handleAction: () => {
        fullSpec.handleAction();
        resolve(true);
      },
    });
  });
}

// eslint-disable-next-line import/prefer-default-export
export function ModalOk() {
  const [generalModalWindow, setGeneralModalWindow] =
    useGeneralOkModalWindowReducer();

  const { handleAction, title, message, show } = generalModalWindow;

  const { t } = useTranslation(['gui-general', 'gui-editor', 'gui-download']);

  return (
    <>
      {/* General modal popup window */}
      <div className="m-5">
        <Modal
          show={show}
          onHide={handleAction}
          className="text-dark"
          style={{ whiteSpace: 'pre-line' }}
        >
          <Modal.Header closeButton>
            <Modal.Title>{title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>{message}</Modal.Body>
          <Modal.Footer>
            <Button
              variant="primary"
              onClick={() => {
                setGeneralModalWindow({ ...generalModalWindow, show: false });
                handleAction();
              }}
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
