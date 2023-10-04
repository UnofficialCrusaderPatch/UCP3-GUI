import { getStore } from 'hooks/jotai/base';
import { atom, useAtom } from 'jotai';
import { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

const VERSION_REGEX = /^[0-9]+[.][0-9]+[.][0-9]+$/;

export type CreatePluginModalResult = {
  pluginName: string;
  pluginAuthor: string;
  pluginVersion: string;
  createModpack: boolean;
};

export type CreatePluginModalWindow = {
  show: boolean;
  message: string;
  title: string;
  handleAction: (result: CreatePluginModalResult) => void;
  handleClose: () => void;
  ok: string;
};

export const DefaultCreatePluginModalWindow: CreatePluginModalWindow = {
  show: false,
  message: '',
  title: '',
  handleAction: () => ({}),
  handleClose: () => {},
  ok: '',
};

export const CREATE_PLUGIN_MODAL_WINDOW_STATE = atom<CreatePluginModalWindow>(
  DefaultCreatePluginModalWindow,
);

export async function showCreatePluginModalWindow(
  spec: Partial<CreatePluginModalWindow>,
) {
  const fullSpec: CreatePluginModalWindow = {
    ...DefaultCreatePluginModalWindow,
    ...spec,
  };

  return new Promise<CreatePluginModalResult | undefined>((resolve) => {
    getStore().set(CREATE_PLUGIN_MODAL_WINDOW_STATE, {
      ...fullSpec,
      show: true,
      handleClose: () => {
        fullSpec.handleClose();
        resolve(undefined);
      },
      handleAction: (result: CreatePluginModalResult) => {
        fullSpec.handleAction(result);
        resolve(result);
      },
    });
  });
}

// eslint-disable-next-line import/prefer-default-export
export function CreatePluginModal() {
  const [window, setWindow] = useAtom(CREATE_PLUGIN_MODAL_WINDOW_STATE);

  const { handleAction, title, message, show, handleClose } = window;

  const { t } = useTranslation(['gui-general', 'gui-editor', 'gui-download']);

  const [pluginName, setPluginName] = useState('');
  const [pluginAuthor, setPluginAuthor] = useState('');
  const [pluginVersion, setPluginVersion] = useState('');
  const [createModpack, setCreateModpack] = useState(false);

  const pluginVersionValid = VERSION_REGEX.exec(pluginVersion) !== null;

  const [versionElementHasFocus, setVersionElementHasFocus] = useState(false);

  return (
    <>
      {/* General modal popup window */}
      <div className="m-5">
        <Modal
          show={show}
          onHide={() => {
            setWindow({ ...window, show: false });
            handleClose();
          }}
          className="text-dark"
          style={{ whiteSpace: 'pre-line' }}
        >
          <Modal.Header closeButton>
            <Modal.Title>{title}</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Label>Plugin name:</Form.Label>
              <Form.Control
                id="create-plugin-name"
                type="text"
                value={pluginName}
                onChange={(e) => {
                  setPluginName(e.target.value);
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
                id="create-plugin-include-dependencies"
                label="Also create a modpack"
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
              onClick={() =>
                new Promise<void>((resolve) => {
                  setWindow({ ...window, show: false });
                  handleAction({
                    pluginName,
                    pluginVersion,
                    pluginAuthor,
                    createModpack,
                  });
                  resolve();
                })
              }
            >
              {window.ok !== undefined && window.ok.length > 0
                ? window.ok
                : 'Create'}
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </>
  );
}
