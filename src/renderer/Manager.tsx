import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import {
  Button,
  Col,
  Container,
  Form,
  ListGroup,
  Modal,
  Row,
} from 'react-bootstrap';
import ToggleButton from 'react-bootstrap/ToggleButton';

import { useReducer, useState } from 'react';
import ConfigEditor from './editor/ConfigEditor';

import { DisplayConfigElement } from './editor/factory/UIElements';
import ExtensionManager from './extensionManager/ExtensionManager';

function getCurrentFolder() {
  return window.electron.ucpBackEnd.getGameFolderPath() || '';
  const sp = new URLSearchParams(global.location.search);
  if (sp.has('window') && sp.get('window') === 'editor') {
    if (sp.has('directory')) {
      return sp.get('directory') as string;
    }
  }
  return '';
}

const currentFolder = getCurrentFolder();

console.log(currentFolder);

function getConfigDefaults(yml: unknown[]) {
  const result: { [url: string]: unknown } = {};

  function yieldDefaults(part: any | DisplayConfigElement): void {
    if (typeof part === 'object') {
      if (Object.keys(part).indexOf('url') > -1) {
        result[part.url as string] = part.default;
      }
      if (Object.keys(part).indexOf('children') > -1) {
        part.children.forEach((child: unknown) => yieldDefaults(child));
      }
    }
  }

  yml.forEach((element: unknown) => yieldDefaults(element));

  return result;
}

let definition: { flat: object[]; hierarchical: object };
let defaults: { [key: string]: unknown };
let ucpVersion: {
  major: number;
  minor: number;
  patch: number;
  sha: string;
  build: string;
};
let isUCP3Installed = false;
let latestUCP3: unknown;

if (currentFolder.length > 0) {
  definition = window.electron.ucpBackEnd.getYamlDefinition(currentFolder);
  defaults = getConfigDefaults(definition.flat as unknown[]);

  ucpVersion = window.electron.ucpBackEnd.getUCPVersion(currentFolder);
  if (ucpVersion.major !== undefined) isUCP3Installed = true;
}

export default function Manager() {
  const extensions = window.electron.ucpBackEnd.getExtensions(currentFolder);

  const warningDefaults = {
    // 'ucp.o_default_multiplayer_speed': {
    //   text: 'ERROR: Conflicting options selected: test warning',
    //   level: 'error',
    // },
  };

  const [warnings, setWarning] = useReducer(
    (
      state: { [key: string]: unknown },
      action: { key: string; value: unknown; reset: boolean }
    ) => {
      const result: { [key: string]: unknown } = { ...state };
      if (action.reset) {
        // Reset to a value
        if (typeof action.value === 'object') {
          return { ...(result.value as object) };
        }

        // Reset to defaults
        return { ...warningDefaults };
      }
      result[action.key] = action.value;

      return result;
    },
    warningDefaults
  );

  const warningCount = Object.values(warnings)
    .map((v) =>
      (v as { text: string; level: string }).level === 'warning' ? 1 : 0
    )
    .reduce((a: number, b: number) => a + b, 0);

  const errorCount = Object.values(warnings)
    .map((v) =>
      (v as { text: string; level: string }).level === 'error' ? 1 : 0
    )
    .reduce((a: number, b: number) => a + b, 0);

  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  return (
    <div className="editor-app m-3 fs-7">
      <div className="col-12">
        <Tabs
          defaultActiveKey="overview"
          id="uncontrolled-tab-example"
          className="mb-3"
        >
          <Tab eventKey="overview" title="Overview">
            <div className="m-3">
              UCP version in this folder:{' '}
              {isUCP3Installed
                ? `${ucpVersion.major}.${ucpVersion.minor}.${
                    ucpVersion.patch
                  } - ${(ucpVersion.sha || '').substring(0, 8)}`
                : `not installed`}
            </div>
            <div className="m-3">
              <Button
                type="button"
                className="btn btn-primary"
                onClick={async () => {
                  const zipFilePath =
                    await window.electron.ucpBackEnd.openFileDialog([
                      { name: 'Zip files', extensions: ['zip'] },
                      { name: 'All files', extensions: ['*'] },
                    ]);

                  if (zipFilePath === '') return;

                  await window.electron.ucpBackEnd.installUCPFromZip(
                    zipFilePath,
                    currentFolder
                  );

                  setShow(true);
                }}
              >
                Install UCP to folder from Zip
              </Button>
              <Modal show={show} onHide={handleClose} className="text-dark">
                <Modal.Header closeButton>
                  <Modal.Title>Reload required</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                  The installation process requires a reload, reload now?
                </Modal.Body>
                <Modal.Footer>
                  <Button variant="secondary" onClick={handleClose}>
                    Close
                  </Button>
                  <Button
                    variant="primary"
                    onClick={(event) => {
                      handleClose();
                      window.electron.ucpBackEnd.reloadWindow();
                    }}
                  >
                    Reload
                  </Button>
                </Modal.Footer>
              </Modal>
            </div>
            <div className="m-3">
              <button type="button" className="btn btn-primary disabled">
                Uninstall UCP from this folder
              </button>
            </div>
            <Form className="m-3 d-none">
              <Form.Switch id="activate-ucp-switch" label="Activate UCP" />
            </Form>
          </Tab>
          <Tab eventKey="extensions" title="Extensions">
            <ExtensionManager extensions={extensions} />
          </Tab>
          <Tab
            eventKey="config"
            title="User Config"
            className="tabpanel-config"
          >
            <ConfigEditor
              folder={currentFolder}
              file={`${currentFolder}/ucp-config-poc.yml`}
              definition={definition}
              defaults={defaults}
              readonly={false}
              warnings={
                warnings as { [key: string]: { text: string; level: string } }
              }
              setWarning={setWarning}
            />
          </Tab>
        </Tabs>

        <div className="fixed-bottom bg-primary">
          <div className="d-flex p-1 px-2 fs-8">
            <div className="flex-grow-1">
              <span className="">
                folder:
                <span className="px-2 fst-italic">{currentFolder}</span>
              </span>
            </div>
            <div>
              <span className="px-2">0 messages</span>
              <span className="px-2">{warningCount} warnings</span>
              <span className="px-2">{errorCount} errors</span>
              <span className="px-2">GUI version: 1.0.0</span>
              <span className="px-2">
                UCP version:{' '}
                {isUCP3Installed
                  ? `${ucpVersion.major}.${ucpVersion.minor}.${
                      ucpVersion.patch
                    } - ${(ucpVersion.sha || '').substring(0, 8)}`
                  : `not installed`}
              </span>
              <span className="px-2">UCP active: {`${isUCP3Installed}`}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
