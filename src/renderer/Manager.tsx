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

import { useReducer, useState, createContext, useEffect } from 'react';
import ConfigEditor from './editor/ConfigEditor';

import { DisplayConfigElement } from './editor/factory/UIElements';
import ExtensionManager from './extensionManager/ExtensionManager';

import {
  activeExtensionsReducer,
  configurationDefaultsReducer,
  configurationReducer,
  configurationTouchedReducer,
  configurationWarningReducer,
  GlobalState,
  UIDefinition,
} from './GlobalState';

import { ucpBackEnd } from './fakeBackend';
import { useSearchParams } from 'react-router-dom';
import { Extension } from '../common/config/common';

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

let uiDefinition: UIDefinition;
let ucpVersion: {
  major: number;
  minor: number;
  patch: number;
  sha: string;
  build: string;
};
let isUCP3Installed = false;
let latestUCP3: unknown;

let extensions: Extension[] = []; // which extension type?

export default function Manager() {
  const [searchParams, _] = useSearchParams();
  const currentFolder = ucpBackEnd.getGameFolderPath(searchParams);

  const warningDefaults = {
    // 'ucp.o_default_multiplayer_speed': {
    //   text: 'ERROR: Conflicting options selected: test warning',
    //   level: 'error',
    // },
  };

  const [configurationWarnings, setConfigurationWarnings] = useReducer(
    configurationWarningReducer,
    {}
  );

  const [configurationDefaults, setConfigurationDefaults] = useReducer(
    configurationDefaultsReducer,
    {}
  );
  const [configurationTouched, setConfigurationTouched] = useReducer(
    configurationTouchedReducer,
    {}
  );
  const [activeExtensions, setActiveExtensions] = useReducer(
    activeExtensionsReducer,
    []
  );

  const [configuration, setConfiguration] = useReducer(
    configurationReducer,
    {}
  );

  const warningCount = Object.values(configurationWarnings)
    .map((v) =>
      (v as { text: string; level: string }).level === 'warning' ? 1 : 0
    )
    .reduce((a: number, b: number) => a + b, 0);

  const errorCount = Object.values(configurationWarnings)
    .map((v) =>
      (v as { text: string; level: string }).level === 'error' ? 1 : 0
    )
    .reduce((a: number, b: number) => a + b, 0);

  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);
  const [checkForUpdatesButtonText, setCheckForUpdatesButtonText] = useState(
    'Download and install the latest UCP version'
  );
  const [guiUpdateStatus, setGuiUpdateStatus] = useState(
    ''
  );

  const [initDone, setInitState] = useState(false);
  useEffect(() => {
    async function prepareValues() {
      console.log(currentFolder);
      if (currentFolder.length > 0) {
        uiDefinition = await ucpBackEnd.getYamlDefinition(currentFolder);
        const defaults = getConfigDefaults(uiDefinition.flat as unknown[]);
      
        ucpVersion = await ucpBackEnd.getUCPVersion(currentFolder);
        if (ucpVersion.major !== undefined) isUCP3Installed = true;
        setConfiguration({
          type: 'reset',
          value: defaults,
        });
        setConfigurationDefaults({
          type: 'reset',
          value: defaults,
        });
      }

      // TODO: currently only set on initial render and folder selection
      // TODO: resolve this type badness
      extensions = (await ucpBackEnd.getExtensions(currentFolder) as unknown) as Extension[];
      setInitState(true);
    }
    prepareValues();
  }, [currentFolder]);
  if (!initDone) {
    return <p>Loading...</p>;
  }

  return (
    <GlobalState.Provider
      value={{
        extensions,
        configurationWarnings,
        setConfigurationWarnings,
        configurationDefaults,
        setConfigurationDefaults,
        configurationTouched,
        setConfigurationTouched,
        activeExtensions,
        setActiveExtensions,
        configuration,
        setConfiguration,
        uiDefinition,
        folder: currentFolder,
        file: `${currentFolder}/ucp-config.yml`,
      }}
    >
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
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async (event) => {
                    setCheckForUpdatesButtonText('Updating...');
                    const updateResult =
                      await ucpBackEnd.checkForUCP3Updates(currentFolder);
                    if (
                      updateResult.update === true &&
                      updateResult.installed === true
                    ) {
                      setShow(true);
                      setCheckForUpdatesButtonText('Updated!');
                    } else {
                      console.log(JSON.stringify(updateResult));
                      setCheckForUpdatesButtonText('No updates available');
                    }
                  }}
                >
                  {checkForUpdatesButtonText}
                </button>
              </div>
              <div className="m-3">
                <Button
                  type="button"
                  className="btn btn-primary"
                  onClick={async () => {
                    const zipFilePath =
                      await ucpBackEnd.openFileDialog(currentFolder, [
                        { name: 'Zip files', extensions: ['zip'] },
                        { name: 'All files', extensions: ['*'] },
                      ]);

                    if (zipFilePath === '') return;

                    await ucpBackEnd.installUCPFromZip(
                      zipFilePath, currentFolder
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
                        ucpBackEnd.reloadWindow();
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
              <div className="m-3">
                <Button onClick={(event) => {
                  ucpBackEnd.checkForGUIUpdates(setGuiUpdateStatus);
                }}>
                  Check for GUI updates
                </Button>
                <span className="mx-1">
                  {guiUpdateStatus}
                </span>
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
              <ConfigEditor readonly={false} gameFolder={currentFolder}/>
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
    </GlobalState.Provider>
  );
}
