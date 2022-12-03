import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';

import { useReducer, useState, useEffect, useMemo } from 'react';
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
import { UCPVersion } from 'function/ucp/ucp-version';
import { UCPState } from 'function/ucp/ucp-state';
import { useCurrentGameFolder } from 'components/general/hooks';
import {
  UCPStateHandler,
  useUCPState,
  useUCPVersion,
} from 'components/general/swr-hooks';
import ConfigEditor from './tabs/config-editor';

import ExtensionManager from './tabs/extension-manager';
import Overview from './tabs/overview';

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
  const currentFolder = useCurrentGameFolder();
  const ucpStateHandlerSwr = useUCPState();
  const ucpVersionSwr = useUCPVersion();

  const { t, i18n } = useTranslation([
    'gui-general',
    'gui-editor',
    'gui-download',
  ]);

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

  if (!initDone || ucpStateHandlerSwr.isLoading || ucpVersionSwr.isLoading) {
    return <p>{t('gui-general:loading')}</p>;
  }

  const ucpStateHandler = ucpStateHandlerSwr.data as UCPStateHandler;
  const ucpState = ucpStateHandler.state;
  const ucpVersion = ucpVersionSwr.data as UCPVersion;

  let ucpFooterVersionString;
  switch (ucpState) {
    case UCPState.NOT_INSTALLED:
      ucpFooterVersionString = t('gui-editor:footer.version.no.ucp');
      break;
    case UCPState.ACTIVE:
      ucpFooterVersionString = ucpVersion.toString();
      break;
    case UCPState.INACTIVE:
      ucpFooterVersionString = ucpVersion.toString();
      break;
    default:
      ucpFooterVersionString = t('gui-editor:footer.version.unknown');
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
              <Overview />
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
