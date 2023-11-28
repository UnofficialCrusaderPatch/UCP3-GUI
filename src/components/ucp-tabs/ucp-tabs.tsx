import './ucp-tabs.css';

import { showGeneralModalOk } from 'components/modals/ModalOk';
import { tryResolveDependencies } from 'function/extensions/discovery';
import { useState } from 'react';
import { Nav, Tab } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import Logger from 'util/scripts/logging';
import { useAtom, useAtomValue } from 'jotai';
import * as GuiSettings from 'function/global/gui-settings/guiSettings';
import {
  DOES_UCP_FOLDER_EXIST_ATOM,
  EXTENSION_STATE_REDUCER_ATOM,
  INIT_DONE,
  INIT_RUNNING,
} from 'function/global/global-atoms';

import ConfigEditor from './config-editor/config-editor';
import ExtensionManager from './extension-manager/extension-manager';
import Overview from './overview/overview';

import Launch from './launch/launch';

const LOGGER = new Logger('ucp-taps.tsx');

export default function UcpTabs() {
  const isInit = useAtomValue(INIT_DONE);
  const isInitRunning = useAtomValue(INIT_RUNNING);

  const { t } = useTranslation(['gui-general', 'gui-editor', 'gui-launch']);

  const displayConfigTabs = isInit && !isInitRunning;

  const extensionsState = useAtomValue(EXTENSION_STATE_REDUCER_ATOM);

  const [showErrorsWarning, setShowErrorsWarning] = useState(true);

  const [advancedMode] = useAtom(GuiSettings.ADVANCED_MODE_ATOM);

  const l = useAtomValue(DOES_UCP_FOLDER_EXIST_ATOM);
  const ucpFolderExists = l.state === 'hasData' && l.data === true;

  return (
    <div className="ucp-tabs fs-7">
      <Tab.Container defaultActiveKey="overview">
        <Nav variant="tabs" className="ucp-tabs-header" data-tauri-drag-region>
          <Nav.Item>
            <Nav.Link
              eventKey="overview"
              className="ornament-border-button tab-link"
            >
              {t('gui-editor:overview.title')}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              eventKey="extensions"
              className="ornament-border-button tab-link"
              disabled={!displayConfigTabs}
              hidden={!ucpFolderExists}
              onClick={async () => {
                try {
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
                } catch (e: any) {
                  await showGeneralModalOk({
                    title: 'ERROR',
                    message: e.toString(),
                  });
                }
              }}
            >
              {t('gui-editor:extensions.title')}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              eventKey="config"
              className="ornament-border-button tab-link"
              disabled={!displayConfigTabs}
              hidden={!advancedMode || !ucpFolderExists}
            >
              {t('gui-editor:config.title')}
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              eventKey="launch"
              className="ornament-border-button tab-link"
            >
              {t('gui-launch:launch')}
            </Nav.Link>
          </Nav.Item>
        </Nav>
        <Tab.Content className="ornament-border">
          <Tab.Pane eventKey="overview" className="tab-panel">
            <Overview />
          </Tab.Pane>
          <Tab.Pane eventKey="extensions" className="tab-panel">
            <ExtensionManager />
          </Tab.Pane>
          <Tab.Pane eventKey="config" className="tab-panel">
            <ConfigEditor readonly={false} />
          </Tab.Pane>
          <Tab.Pane eventKey="launch" className="tab-panel">
            <Launch />
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </div>
  );
}
