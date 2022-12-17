import ConfigEditor from 'components/editor/tabs/config-editor';
import ExtensionManager from 'components/editor/tabs/extension-manager';
import Overview from 'components/editor/tabs/overview';
import { useCurrentGameFolder } from 'components/general/hooks';
import { Nav, Tab } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';

import './ucp-tabs.css';

export default function UcpTabs() {
  const currentFolder = useCurrentGameFolder();

  const { t } = useTranslation(['gui-general', 'gui-editor']);

  return (
    <div className="ucp-tabs fs-7">
      <Tab.Container defaultActiveKey="overview">
        <Nav variant="tabs" className="ucp-tabs-header mb-3">
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
            <ExtensionManager extensions={[]} />
          </Tab.Pane>
          <Tab.Pane eventKey="config" className="tabpanel-config h-100">
            <ConfigEditor readonly={false} gameFolder={currentFolder} />
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </div>
  );
}
