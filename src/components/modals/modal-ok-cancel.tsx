import { Modal, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { AbstractModalWindowProperties, registerModal } from './abstract-modal';

export interface OkCancelModalWindowProperties
  extends AbstractModalWindowProperties<boolean, boolean> {
  cancel: string;
}

const DEFAULT_OK_CANCEL_MODAL_PROPERTIES: OkCancelModalWindowProperties = {
  message: '',
  title: '',
  handleAction: () => {},
  handleClose: () => {},
  ok: '',
  cancel: '',
};

function ModalOkCancel(props: OkCancelModalWindowProperties) {
  const { handleClose, handleAction, title, message, ok, cancel } = props;

  const [show, setShow] = useState(true);

  const { t } = useTranslation(['gui-general']);

  const internalHandleAction = () => {
    setShow(false);
    handleAction(true);
  };

  const internalHandleClose = () => {
    setShow(false);
    handleClose(false);
  };

  return (
    <Modal
      show={show}
      onHide={internalHandleClose}
      className="text-dark"
      style={{ whiteSpace: 'pre-line' }}
      // prevents escaping the modal:
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>{message}</Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={internalHandleClose}>
          {cancel.length > 0 ? cancel : t('gui-general:cancel')}
        </Button>
        <Button variant="primary" onClick={internalHandleAction}>
          {ok.length > 0 ? ok : t('gui-general:ok')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export async function showModalOkCancel(
  spec: Partial<OkCancelModalWindowProperties>,
) {
  const fullSpec: OkCancelModalWindowProperties = {
    ...DEFAULT_OK_CANCEL_MODAL_PROPERTIES,
    ...spec,
  };

  return registerModal<boolean, boolean, OkCancelModalWindowProperties>(
    ModalOkCancel,
    fullSpec,
  );
}
