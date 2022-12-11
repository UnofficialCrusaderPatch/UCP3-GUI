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
import { DisplayConfigElement, Extension } from 'config/ucp/common';
import { useCurrentGameFolder } from 'components/general/hooks';
import { Nav } from 'react-bootstrap';
import {
  extensionsToOptionEntries,
  getExtensions,
} from 'config/ucp/extension-util';
import ConfigEditor from './tabs/config-editor';

import ExtensionManager from './tabs/extension-manager';
import Overview from './tabs/overview';
import Footer from './footer';

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

let extensions: Extension[] = []; // which extension type?

export default function Manager() {
  const currentFolder = useCurrentGameFolder();

  const { t, i18n } = useTranslation(['gui-general', 'gui-editor']);

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
      extensions = (await getExtensions(
        currentFolder,
        i18n.language
      )) as unknown as Extension[];

      if (currentFolder.length > 0) {
        const optionEntries = extensionsToOptionEntries(extensions);
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

  if (!initDone) {
    return <p>{t('gui-general:loading')}</p>;
  }

  return (
    <GlobalState.Provider value={globalStateValue}>
      <div className="editor-app fs-7">
        <div className="m-3 flex-grow-1 d-flex flex-column overflow-hidden">
          <Tab.Container defaultActiveKey="overview">
            <Nav variant="tabs" className="mb-3">
              <Nav.Item>
                <Nav.Link eventKey="overview">
                  {t('gui-editor:overview.title')}
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="extensions">
                  {t('gui-editor:extensions.title')}
                </Nav.Link>
              </Nav.Item>
              <Nav.Item>
                <Nav.Link eventKey="config">
                  {t('gui-editor:config.title')}
                </Nav.Link>
              </Nav.Item>
            </Nav>
            <Tab.Content className="overflow-auto">
              <Tab.Pane eventKey="overview" className="h-100">
                <Overview />
              </Tab.Pane>
              <Tab.Pane eventKey="extensions" className="h-100">
                <ExtensionManager extensions={extensions} />
              </Tab.Pane>
              <Tab.Pane eventKey="config" className="tabpanel-config h-100">
                <ConfigEditor readonly={false} gameFolder={currentFolder} />
              </Tab.Pane>
            </Tab.Content>
          </Tab.Container>
        </div>

        <Footer />
      </div>
    </GlobalState.Provider>
  );
}
