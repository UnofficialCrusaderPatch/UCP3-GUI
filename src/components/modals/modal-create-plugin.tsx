import { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { AbstractModalWindowProperties, registerModal } from './abstract-modal';
import Message from '../general/message';

type Create = {
  type: 'create';
  pluginName: string;
  pluginAuthor: string;
  pluginVersion: string;
  createModpack: boolean;
};

type Overwrite = {
  type: 'overwrite';
  pluginName: string;
  pluginAuthor: string;
  pluginVersion: string;
  createModpack: boolean;
};

export type CreatePluginModalResult = Create | Overwrite;

export interface CreatePluginModalWindowProperties
  extends AbstractModalWindowProperties<CreatePluginModalResult, void> {}

const VERSION_REGEX = /^[0-9]+[.][0-9]+[.][0-9]+$/;

const DEFAULT_CREATE_PLUGIN_MODAL_PROPERTIES: CreatePluginModalWindowProperties =
  {
    handleAction: () => {},
    handleClose: () => {},
  };

const sanitizePluginName = (s: string) => s.replaceAll(/[^a-zA-Z0-9-]/g, '');

// eslint-disable-next-line import/prefer-default-export
function CreatePluginModal(props: CreatePluginModalWindowProperties) {
  const { handleAction, title, ok, handleClose, alternativeMessageSource } =
    props;

  const [show, setShow] = useState(true);

  const [pluginName, setPluginName] = useState('');
  const [pluginAuthor, setPluginAuthor] = useState('');
  const [pluginVersion, setPluginVersion] = useState('1.0.0');
  const [createModpack, setCreateModpack] = useState(false);

  const pluginVersionValid = VERSION_REGEX.exec(pluginVersion) !== null;

  const [versionElementHasFocus, setVersionElementHasFocus] = useState(false);

  const internalHandleClose = () => {
    setShow(false);
    handleClose();
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
      <Modal.Header closeButton>
        <Modal.Title>
          <Message
            message={title}
            alternativeSource={alternativeMessageSource}
          />
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Label>Plugin name:</Form.Label>
          <Form.Control
            id="create-plugin-name"
            type="text"
            value={pluginName}
            onChange={(e) => {
              setPluginName(sanitizePluginName(e.target.value));
            }}
          />
          <Form.Label>Plugin author:</Form.Label>
          <Form.Control
            id="create-plugin-author"
            type="text"
            value={pluginAuthor}
            onChange={(e) => {
              setPluginAuthor(e.target.value);
            }}
          />
          <Form.Label>Plugin version (format: 1.0.0):</Form.Label>
          <Form.Control
            id="create-plugin-version"
            type="text"
            value={pluginVersion}
            onChange={(e) => {
              setPluginVersion(e.target.value);
            }}
            onFocus={() => {
              setVersionElementHasFocus(true);
            }}
            onBlur={() => {
              setVersionElementHasFocus(false);
            }}
            style={
              !versionElementHasFocus &&
              pluginVersion.length > 0 &&
              !pluginVersionValid
                ? { backgroundColor: 'red' }
                : {}
            }
          />
          <Form.Switch
            // Not implemented yet
            style={{ display: 'none' }}
            id="create-plugin-include-dependencies"
            label={<Message message="modal.create.plugin.modpack" />}
            checked={createModpack}
            onChange={(e) => {
              setCreateModpack(e.target.checked);
            }}
          />
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="primary"
          disabled={
            pluginName.length === 0 ||
            pluginAuthor.length === 0 ||
            !pluginVersionValid
          }
          onClick={() => {
            setShow(false);
            handleAction({
              type: 'create',
              pluginName,
              pluginVersion,
              pluginAuthor,
              createModpack,
            });
          }}
        >
          <Message
            message={ok !== undefined ? ok : 'create'}
            alternativeSource={alternativeMessageSource}
          />
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export async function showModalCreatePlugin(
  spec: Partial<CreatePluginModalWindowProperties>,
) {
  const fullSpec: CreatePluginModalWindowProperties = {
    ...DEFAULT_CREATE_PLUGIN_MODAL_PROPERTIES,
    ...spec,
  };

  return registerModal<
    CreatePluginModalResult,
    void,
    CreatePluginModalWindowProperties
  >(CreatePluginModal, fullSpec);
}
