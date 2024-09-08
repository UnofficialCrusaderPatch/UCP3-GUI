import './modals.css';

import { Modal, Button } from 'react-bootstrap';
import { useState } from 'react';
import { AbstractModalWindowProperties, registerModal } from './abstract-modal';
import Text from '../general/text';

export interface OkModalWindowProperties
  extends Omit<AbstractModalWindowProperties<void, void>, 'handleClose'> {}

const DEFAULT_OK_MODAL_PROPERTIES: AbstractModalWindowProperties<void, void> = {
  handleAction: () => {},
  handleClose: () => {},
};

function ModalOk(props: OkModalWindowProperties) {
  const { handleAction, title, message, ok, alternativeMessageSource } = props;

  const [show, setShow] = useState(true);

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
        <Modal.Title className="h5">
          <Text message={title} alternativeSource={alternativeMessageSource} />
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="fs-8">
        <Text message={message} alternativeSource={alternativeMessageSource} />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={internalHandleAction}>
          <Text
            message={ok !== undefined ? ok : 'ok'}
            alternativeSource={alternativeMessageSource}
          />
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
