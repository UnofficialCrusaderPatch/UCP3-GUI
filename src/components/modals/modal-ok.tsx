import './modals.css';

import { Modal, Button } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { AbstractModalWindowProperties, registerModal } from './abstract-modal';

export interface OkModalWindowProperties
  extends Omit<AbstractModalWindowProperties<void, void>, 'handleClose'> {}

const DEFAULT_OK_MODAL_PROPERTIES: AbstractModalWindowProperties<void, void> = {
  message: '',
  title: '',
  handleAction: () => {},
  handleClose: () => {},
  ok: '',
};

function ModalOk(props: OkModalWindowProperties) {
  const { handleAction, title, message, ok } = props;

  const [show, setShow] = useState(true);

  const { t } = useTranslation(['gui-general']);

  const internalHandleAction = () => {
    setShow(false);
    handleAction();
  };

  const { style } = props;

  let extraClassInfo = '';
  if (style !== undefined) {
    if (style.wide) {
      extraClassInfo = 'wide';
    }
  }

  return (
    <Modal
      bsPrefix="modal ucp-modal"
      show={show}
      onHide={internalHandleAction}
      className={`text-dark ${extraClassInfo}`}
      style={{ whiteSpace: 'pre-line' }}
      // prevents escaping the modal:
      backdrop="static"
      keyboard={false}
    >
      <Modal.Header>
        <Modal.Title className="h5">{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body className="fs-8">{message}</Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={internalHandleAction}>
          {ok.length > 0 ? ok : t('gui-general:ok')}
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export async function showModalOk(spec: Partial<OkModalWindowProperties>) {
  const fullSpec: AbstractModalWindowProperties<void, void> = {
    ...DEFAULT_OK_MODAL_PROPERTIES,
    ...spec,
  };

  return registerModal<void, void, AbstractModalWindowProperties<void, void>>(
    ModalOk,
    fullSpec,
  );
}
