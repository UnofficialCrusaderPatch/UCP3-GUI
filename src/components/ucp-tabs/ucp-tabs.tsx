import { showGeneralModalOk } from 'components/modals/ModalOk';
import { tryResolveDependencies } from 'function/extensions/discovery';
import {
  useExtensionState,
  useInitDoneValue,
  useInitRunningValue,
} from 'hooks/jotai/globals-wrapper';
import { useState } from 'react';
import { Nav, Tab } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import Logger from 'util/scripts/logging';
import { useAtom, useAtomValue } from 'jotai';
import * as GuiSettings from 'function/global/gui-settings/guiSettings';
import { DOES_UCP_FOLDER_EXIST_ATOM } from 'function/global/global-atoms';

import ConfigEditor from './config-editor/config-editor';
import ExtensionManager from './extension-manager/extension-manager';
import Overview from './overview/overview';

import './ucp-tabs.css';

const LOGGER = new Logger('ucp-taps.tsx');

export default function UcpTabs() {
  const isInit = useInitDoneValue();
  const isInitRunning = useInitRunningValue();

  const { t } = useTranslation(['gui-general', 'gui-editor']);

  const displayConfigTabs = isInit && !isInitRunning;

  const extensionsState = useExtensionState();

  const [showErrorsWarning, setShowErrorsWarning] = useState(true);

  const [advancedMode] = useAtom(GuiSettings.ADVANCED_MODE_ATOM);

  const l = useAtomValue(DOES_UCP_FOLDER_EXIST_ATOM);
  const ucpFolderExists = l.state === 'hasData' && l.data === true;

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
              hidden={!ucpFolderExists}
              onClick={async () => {
                if (!showErrorsWarning) {
                  return;
                }

                const messages = tryResolveDependencies(
                  extensionsState.extensions,
                );

                if (messages.length === 0) return;

                await showGeneralModalOk({
                  title: 'Error: missing dependencies',
                  message: `Please be aware of the following missing dependencies:\n\n${messages}`,
                  handleAction: () => setShowErrorsWarning(false),
                });

                LOGGER.msg(`Missing dependencies: ${messages}`).error();
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
              hidden={!advancedMode || !ucpFolderExists}
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
