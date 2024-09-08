/* eslint-disable react/require-default-props */
import { Modal, Button } from 'react-bootstrap';
import { useState } from 'react';
import { AbstractModalWindowProperties, registerModal } from './abstract-modal';
import { MessageType } from '../../localization/localization';
import Message from '../general/message';

export interface OkCancelModalWindowProperties
  extends AbstractModalWindowProperties<boolean, boolean> {
  cancel?: MessageType;
}

const DEFAULT_OK_CANCEL_MODAL_PROPERTIES: OkCancelModalWindowProperties = {
  handleAction: () => {},
  handleClose: () => {},
};

function ModalOkCancel(props: OkCancelModalWindowProperties) {
  const {
    handleClose,
    handleAction,
    title,
    message,
    ok,
    cancel,
    alternativeMessageSource,
  } = props;

  const [show, setShow] = useState(true);

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
        <Modal.Title>
          <Message
            message={title}
            alternativeSource={alternativeMessageSource}
          />
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Message
          message={message}
          alternativeSource={alternativeMessageSource}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={internalHandleClose}>
          <Message
            message={cancel !== undefined ? ok : 'cancel'}
            alternativeSource={alternativeMessageSource}
          />
        </Button>
        <Button variant="primary" onClick={internalHandleAction}>
          <Message
            message={ok !== undefined ? ok : 'ok'}
            alternativeSource={alternativeMessageSource}
          />
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
