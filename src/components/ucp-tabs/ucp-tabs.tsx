import { showGeneralModalOk } from 'components/modals/ModalOk';
import { showGeneralModalOkCancel } from 'components/modals/ModalOkCancel';
import { tryResolveDependencies } from 'function/extensions/discovery';
import {
  useExtensionStateReducer,
  useGeneralOkayCancelModalWindowReducer,
  useGeneralOkModalWindowReducer,
  useInitDoneValue,
  useInitRunningValue,
} from 'hooks/jotai/globals-wrapper';
import { useEffect, useState } from 'react';
import { Nav, Tab } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { error, warn } from 'util/scripts/logging';
import ConfigEditor from './config-editor/config-editor';
import ExtensionManager from './extension-manager/extension-manager';
import Overview from './overview/overview';

import './ucp-tabs.css';

export default function UcpTabs() {
  const isInit = useInitDoneValue();
  const isInitRunning = useInitRunningValue();

  const { t } = useTranslation(['gui-general', 'gui-editor']);

  const displayConfigTabs = isInit && !isInitRunning;

  const [generalOkModalWindow, setGeneralOkModalWindow] =
    useGeneralOkModalWindowReducer();
  const [extensionsState, setExtensionsState] = useExtensionStateReducer();

  const [showErrorsWarning, setShowErrorsWarning] = useState(true);

  return (
    <div className="ucp-tabs fs-7">
      <Tab.Container defaultActiveKey="overview">
        <Nav variant="tabs" className="ucp-tabs-header" data-tauri-drag-region>
          <Nav.Item>
            <Nav.Link eventKey="overview" className="tab-link">
              {t('gui-editor:overview.title')}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              eventKey="extensions"
              className="tab-link"
              disabled={!displayConfigTabs}
              onClick={async () => {
                if (!showErrorsWarning) {
                  return;
                }

                const messages = tryResolveDependencies(
                  extensionsState.extensions
                );

                await showGeneralModalOk(
                  {
                    title: 'Error: missing dependencies',
                    message: `Please be aware of the following missing dependencies:\n\n${messages}`,
                    handleAction: () => setShowErrorsWarning(false),
                  },
                  setGeneralOkModalWindow
                );

                error(`Missing dependencies: ${messages}`);
              }}
            >
              {t('gui-editor:extensions.title')}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              eventKey="config"
              className="tab-link"
              disabled={!displayConfigTabs}
            >
              {t('gui-editor:config.title')}
            </Nav.Link>
          </Nav.Item>
        </Nav>
        <Tab.Content className="overflow-auto h-100">
          <Tab.Pane eventKey="overview" className="h-100">
            <Overview />
          </Tab.Pane>
          <Tab.Pane eventKey="extensions" className="h-100">
            <ExtensionManager />
          </Tab.Pane>
          <Tab.Pane eventKey="config" className="tabpanel-config h-100">
            <ConfigEditor readonly={false} />
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </div>
  );
}
