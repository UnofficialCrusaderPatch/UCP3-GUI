import { GeneralOkModalWindow } from 'function/global/types';
import { getStore } from 'hooks/jotai/base';
import { useAtom } from 'jotai';
import { atomWithReducer } from 'jotai/utils';
import { Modal, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const generalOkModalWindowReducer = (
  oldState: GeneralOkModalWindow,
  newState: Partial<GeneralOkModalWindow>,
): GeneralOkModalWindow => {
  const state = { ...oldState, ...newState };
  return state;
};

const GENERAL_OK_MODAL_WINDOW_REDUCER_ATOM = atomWithReducer(
  {
    type: 'ok',
    show: false,
    message: '',
    title: '',
    handleAction: () => {},
    ok: '',
  },
  generalOkModalWindowReducer,
);

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
  const [generalModalWindow, setGeneralModalWindow] = useAtom(
    GENERAL_OK_MODAL_WINDOW_REDUCER_ATOM,
  );

  const { handleAction, title, message, show } = generalModalWindow;

  const { t } = useTranslation(['gui-general', 'gui-editor', 'gui-download']);

  /* General modal popup window */
  return (
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
  );
}
