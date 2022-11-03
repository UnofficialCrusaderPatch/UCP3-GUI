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

import { useReducer, useState, createContext, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import languages from './i18n/languages.json';
import ConfigEditor from './editor/ConfigEditor';

import ExtensionManager from './extensionManager/ExtensionManager';

import {
  activeExtensionsReducer,
  configurationDefaultsReducer,
  configurationReducer,
  configurationTouchedReducer,
  configurationWarningReducer,
  ExtensionsState,
  GlobalState,
  UIDefinition,
} from './GlobalState';

import { ucpBackEnd } from './fakeBackend';
import { DisplayConfigElement, Extension } from '../common/config/common';
import {
  checkForUCP3Updates,
  installUCPFromZip,
} from './utils/ucp-download-handling';
import { getGameFolderPath } from './utils/file-utils';

function getConfigDefaults(yml: unknown[]) {
  const result: { [url: string]: unknown } = {};

  function yieldDefaults(part: any | DisplayConfigElement): void {
    if (typeof part === 'object') {
      if (Object.keys(part).indexOf('url') > -1) {
        result[part.url as string] = (part.value || {}).default;
      }
      if (Object.keys(part).indexOf('children') > -1) {
        part.children.forEach((child: unknown) => yieldDefaults(child));
      }
    }
  }

  yml.forEach((element: unknown) => yieldDefaults(element));

  return result;
}

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

let activeLanguage: string;

export default function Manager() {
  const [searchParams] = useSearchParams();
  const currentFolder = getGameFolderPath(searchParams);

  const { t, i18n } = useTranslation([
    'gui-general',
    'gui-editor',
    'gui-download',
  ]);

  activeLanguage = (languages as { [lang: string]: string })[i18n.language];

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

  const [extensionsState, setExtensionsState] = useReducer(
    (oldState: ExtensionsState, newState: unknown): ExtensionsState => {
      const state = { ...oldState, ...(newState as object) };
      return state;
    },
    {
      allExtensions: [...extensions],
      activeExtensions: [],
      activatedExtensions: [],
      installedExtensions: [...extensions],
    } as ExtensionsState
  );

  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);
  const [checkForUpdatesButtonText, setCheckForUpdatesButtonText] =
    useState<string>(t('gui-editor:overview.download.install'));
  const [guiUpdateStatus, setGuiUpdateStatus] = useState('');

  const [initDone, setInitState] = useState(false);
  useEffect(() => {
    async function prepareValues() {
      console.log(`Current folder: ${currentFolder}`);
      console.log(`Current locale: ${i18n.language}`);

      // TODO: currently only set on initial render and folder selection
      // TODO: resolve this type badness
      extensions = (await ucpBackEnd.getExtensions(
        currentFolder,
        i18n.language
      )) as unknown as Extension[];

      if (currentFolder.length > 0) {
        const optionEntries = ucpBackEnd.extensionsToOptionEntries(extensions);
        const defaults = getConfigDefaults(optionEntries);

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

      setExtensionsState({
        allExtensions: [...extensions],
        activeExtensions: [],
        activatedExtensions: [],
        installedExtensions: [...extensions],
      } as ExtensionsState);

      console.log('Finished loading');
      setInitState(true);
    }
    prepareValues();
  }, [currentFolder, i18n.language]);

  const globalStateValue = useMemo(
    () => ({
      initDone,
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
      folder: currentFolder,
      file: `${currentFolder}/ucp-config.yml`,
      extensionsState,
      setExtensionsState,
    }),
    [
      initDone,
      activeExtensions,
      configuration,
      configurationDefaults,
      configurationTouched,
      configurationWarnings,
      currentFolder,
      extensionsState,
      setExtensionsState,
    ]
  );

  if (!initDone) {
    return <p>{t('gui-general:loading')}</p>;
  }

  return (
    <GlobalState.Provider value={globalStateValue}>
      <div className="editor-app m-3 fs-7">
        <div className="col-12">
          <Tabs
            defaultActiveKey="overview"
            id="uncontrolled-tab-example"
            className="mb-3"
          >
            <Tab eventKey="overview" title={t('gui-editor:overview.title')}>
              <div className="m-3">
                {t('gui-editor:overview.folder.version')}{' '}
                {isUCP3Installed
                  ? `${ucpVersion.major}.${ucpVersion.minor}.${
                      ucpVersion.patch
                    } - ${(ucpVersion.sha || '').substring(0, 8)}`
                  : t('gui-editor:overview.not.installed')}
              </div>
              <div className="m-3">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={async (event) => {
                    setCheckForUpdatesButtonText(
                      t('gui-editor:overview.update.running')
                    );
                    const updateResult = await checkForUCP3Updates(
                      currentFolder,
                      (status) => setCheckForUpdatesButtonText(status),
                      t
                    );
                    if (
                      updateResult.update === true &&
                      updateResult.installed === true
                    ) {
                      setShow(true);
                      setCheckForUpdatesButtonText(
                        t('gui-editor:overview.update.done')
                      );
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
                    const zipFilePath = await ucpBackEnd.openFileDialog(
                      currentFolder,
                      [
                        { name: 'Zip files', extensions: ['zip'] },
                        { name: 'All files', extensions: ['*'] },
                      ]
                    );

                    if (zipFilePath === '') return;

                    // TODO: improve feedback
                    const zipInstallResult = await installUCPFromZip(
                      zipFilePath,
                      currentFolder,
                      // can be used to transform -> although splitting into more components might be better
                      (status) => console.log(status),
                      t
                    );

                    setShow(true);
                  }}
                >
                  {t('gui-editor:overview.install.from.zip')}
                </Button>
                <Modal show={show} onHide={handleClose} className="text-dark">
                  <Modal.Header closeButton>
                    <Modal.Title>
                      {t('gui-general:require.reload.title')}
                    </Modal.Title>
                  </Modal.Header>
                  <Modal.Body>
                    {t('gui-editor:overview.require.reload.text')}
                  </Modal.Body>
                  <Modal.Footer>
                    <Button variant="secondary" onClick={handleClose}>
                      {t('gui-general:close')}
                    </Button>
                    <Button
                      variant="primary"
                      onClick={(event) => {
                        handleClose();
                        ucpBackEnd.reloadWindow();
                      }}
                    >
                      {t('gui-general:reload')}
                    </Button>
                  </Modal.Footer>
                </Modal>
              </div>
              <div className="m-3">
                <button type="button" className="btn btn-primary disabled">
                  {t('gui-editor:overview.uninstall')}
                </button>
              </div>
              <div className="m-3">
                <Button
                  onClick={(event) => {
                    ucpBackEnd.checkForGUIUpdates(setGuiUpdateStatus);
                  }}
                >
                  {t('gui-editor:overview.update.gui.check')}
                </Button>
                <span className="mx-1">{guiUpdateStatus}</span>
              </div>
              <Form className="m-3 d-none">
                <Form.Switch id="activate-ucp-switch" label="Activate UCP" />
              </Form>
            </Tab>
            <Tab eventKey="extensions" title={t('gui-editor:extensions.title')}>
              <ExtensionManager extensions={extensions} />
            </Tab>
            <Tab
              eventKey="config"
              title={t('gui-editor:config.title')}
              className="tabpanel-config"
            >
              <ConfigEditor readonly={false} gameFolder={currentFolder} />
            </Tab>
          </Tabs>

          <div className="fixed-bottom bg-primary">
            <div className="d-flex p-1 px-2 fs-8">
              <div className="flex-grow-1">
                <span className="">
                  {t('gui-editor:footer.folder')}
                  <span className="px-2 fst-italic">{currentFolder}</span>
                </span>
              </div>
              <div>
                <span className="px-2">
                  {t('gui-general:messages', { count: 0 })}
                </span>
                <span className="px-2">
                  {t('gui-general:warnings', { count: warningCount })}
                </span>
                <span className="px-2">
                  {t('gui-general:errors', { count: errorCount })}
                </span>
                <span className="px-2">
                  {t('gui-editor:footer.version.gui', { version: '1.0.0' })}
                </span>
                <span className="px-2">
                  {t('gui-editor:footer.version.ucp', {
                    version: isUCP3Installed
                      ? `${ucpVersion.major}.${ucpVersion.minor}.${
                          ucpVersion.patch
                        } - ${(ucpVersion.sha || '').substring(0, 8)}`
                      : t('gui-editor:footer.version.no.ucp'),
                  })}
                </span>
                <span className="px-2">
                  {t('gui-editor:footer.ucp.active', {
                    active: isUCP3Installed,
                  })}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </GlobalState.Provider>
  );
}
