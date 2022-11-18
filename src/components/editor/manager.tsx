import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import { Button, Form, Modal } from 'react-bootstrap';

import { useReducer, useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import {
  activeExtensionsReducer,
  configurationDefaultsReducer,
  configurationReducer,
  configurationTouchedReducer,
  configurationWarningReducer,
  ExtensionsState,
  GlobalState,
} from 'function/global-state';
import { ucpBackEnd } from 'function/fake-backend';
import { DisplayConfigElement, Extension } from 'config/ucp/common';
import {
  checkForUCP3Updates,
  installUCPFromZip,
} from 'function/download/ucp-download-handling';
import { getGameFolderPath } from 'tauri/tauri-files';
import StateButton from 'components/general/state-button';
import Result from 'util/structs/result';
import {
  getEmptyUCPVersion,
  loadUCPVersion,
  UCPVersion,
} from 'function/ucp/ucp-version';
import {
  activateUCP,
  deactivateUCP,
  getUCPState,
  UCPState,
} from 'function/ucp/ucp-state';
import ConfigEditor from './config-editor';

import ExtensionManager from './extension-manager';

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

let ucpVersion: UCPVersion;
const ucpStateArray = [
  'wrong.folder',
  'not.installed',
  'active',
  'inactive',
  'bink.version.differences',
  'unknown',
];

let extensions: Extension[] = []; // which extension type?

export default function Manager() {
  const [searchParams] = useSearchParams();
  const currentFolder = getGameFolderPath(searchParams);

  const { t, i18n } = useTranslation([
    'gui-general',
    'gui-editor',
    'gui-download',
  ]);

  const [overviewButtonActive, setOverviewButtonActive] = useState(true);
  const [ucpState, setUCPState] = useState(UCPState.UNKNOWN);

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

        ucpVersion = (await loadUCPVersion(currentFolder))
          .ok()
          .getOrReceive(getEmptyUCPVersion);
        setUCPState(
          (await Result.tryAsync(getUCPState, currentFolder))
            .ok()
            .getOrElse(UCPState.UNKNOWN)
        );
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

  let activateButtonString;
  let ucpVersionString;
  let ucpFooterVersionString;
  switch (ucpState) {
    case UCPState.NOT_INSTALLED:
      ucpVersionString = t('gui-editor:overview.not.installed');
      ucpFooterVersionString = t('gui-editor:footer.version.no.ucp');
      activateButtonString = t('gui-editor:overview.activate.not.installed');
      break;
    case UCPState.ACTIVE:
      ucpVersionString = ucpVersion.toString();
      ucpFooterVersionString = ucpVersionString;
      activateButtonString = t('gui-editor:overview.activate.do.deactivate');
      break;
    case UCPState.INACTIVE:
      ucpVersionString = ucpVersion.toString();
      ucpFooterVersionString = ucpVersionString;
      activateButtonString = t('gui-editor:overview.activate.do.activate');
      break;
    default:
      ucpVersionString = t('gui-editor:overview.unknown.state');
      ucpFooterVersionString = t('gui-editor:footer.version.unknown');
      activateButtonString = t('gui-editor:overview.activate.unknown');
      break;
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
                {t('gui-editor:overview.folder.version')} {ucpVersionString}
              </div>
              <StateButton
                buttonActive={
                  overviewButtonActive &&
                  (ucpState === UCPState.ACTIVE ||
                    ucpState === UCPState.INACTIVE)
                }
                buttonValues={{
                  idle: activateButtonString,
                  running: activateButtonString,
                  success: activateButtonString,
                  failed: activateButtonString,
                }}
                buttonVariant="primary"
                funcBefore={() => setOverviewButtonActive(false)}
                funcAfter={() => setOverviewButtonActive(true)}
                func={async () => {
                  let result = Result.emptyOk<string>();
                  if (ucpState === UCPState.ACTIVE) {
                    result = (await deactivateUCP(currentFolder)).mapErr(
                      String
                    );
                    result.ok().ifPresent(() => {
                      setUCPState(UCPState.INACTIVE);
                    });
                  } else if (ucpState === UCPState.INACTIVE) {
                    result = (await activateUCP(currentFolder)).mapErr(String);
                    result.ok().ifPresent(() => {
                      setUCPState(UCPState.ACTIVE);
                    });
                  }
                  return result;
                }}
              />
              <StateButton
                buttonActive={overviewButtonActive}
                buttonValues={{
                  idle: t('gui-editor:overview.update.idle'),
                  running: t('gui-editor:overview.update.running'),
                  success: t('gui-editor:overview.update.success'),
                  failed: t('gui-editor:overview.update.failed'),
                }}
                buttonVariant="primary"
                funcBefore={() => setOverviewButtonActive(false)}
                funcAfter={() => setOverviewButtonActive(true)}
                func={async (stateUpdate) => {
                  const updateResult = await checkForUCP3Updates(
                    currentFolder,
                    (status) => stateUpdate(status),
                    t
                  );
                  if (
                    updateResult.update === true &&
                    updateResult.installed === true
                  ) {
                    setShow(true);
                    setUCPState(UCPState.ACTIVE);
                    return Result.ok('');
                  }
                  return Result.emptyErr();
                }}
              />
              <StateButton
                buttonActive={overviewButtonActive}
                buttonValues={{
                  idle: t('gui-editor:overview.zip.idle'),
                  running: t('gui-editor:overview.zip.running'),
                  success: t('gui-editor:overview.zip.success'),
                  failed: t('gui-editor:overview.zip.failed'),
                }}
                buttonVariant="primary"
                funcBefore={() => setOverviewButtonActive(false)}
                funcAfter={() => setOverviewButtonActive(true)}
                func={async (stateUpdate) => {
                  setOverviewButtonActive(false);
                  const zipFilePath = await ucpBackEnd.openFileDialog(
                    currentFolder,
                    [
                      { name: 'Zip files', extensions: ['zip'] },
                      { name: 'All files', extensions: ['*'] },
                    ]
                  );

                  if (zipFilePath === '') return Result.err('');

                  // TODO: improve feedback
                  const zipInstallResult = await installUCPFromZip(
                    zipFilePath,
                    currentFolder,
                    // can be used to transform -> although splitting into more components might be better
                    (status) => stateUpdate(status),
                    t
                  );
                  zipInstallResult.ok().ifPresent(() => {
                    setUCPState(UCPState.ACTIVE);
                    setShow(true);
                  });
                  setOverviewButtonActive(true);
                  return zipInstallResult
                    .mapOk(() => '')
                    .mapErr((err) => String(err));
                }}
              />
              <div className="m-3">
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
              <StateButton
                buttonActive={false}
                buttonValues={{
                  idle: t('gui-editor:overview.uninstall.idle'),
                  running: t('gui-editor:overview.uninstall.running'),
                  success: t('gui-editor:overview.uninstall.success'),
                  failed: t('gui-editor:overview.uninstall.failed'),
                }}
                buttonVariant="primary"
                funcBefore={() => setOverviewButtonActive(false)}
                funcAfter={() => setOverviewButtonActive(true)}
                func={async (stateUpdate) => Result.emptyOk()}
              />
              <StateButton
                buttonActive={overviewButtonActive}
                buttonValues={{
                  idle: t('gui-editor:overview.update.gui.idle'),
                  running: t('gui-editor:overview.update.gui.running'),
                  success: t('gui-editor:overview.update.gui.success'),
                  failed: t('gui-editor:overview.update.gui.failed'),
                }}
                buttonVariant="primary"
                funcBefore={() => setOverviewButtonActive(false)}
                funcAfter={() => setOverviewButtonActive(true)}
                func={async (stateUpdate) =>
                  Result.tryAsync(() =>
                    ucpBackEnd.checkForGUIUpdates(stateUpdate)
                  )
                }
              />
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
                    version: ucpFooterVersionString,
                  })}
                </span>
                <span className="px-2">
                  {t('gui-editor:footer.state.prefix', {
                    state: t(
                      `gui-editor:footer.state.${ucpStateArray[ucpState]}`
                    ),
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
