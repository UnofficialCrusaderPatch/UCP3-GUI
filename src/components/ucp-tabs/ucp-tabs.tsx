/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import './ucp-tabs.css';

import { useState } from 'react';
import { Nav, Tab } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Atom, atom, useAtom, useAtomValue } from 'jotai';
import {
  INIT_DONE,
  INIT_RUNNING,
  INIT_ERROR,
} from '../../function/game-folder/initialization-states';
import Logger from '../../util/scripts/logging';
import { showModalOk } from '../modals/modal-ok';
import * as GuiSettings from '../../function/gui-settings/settings';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../function/extensions/state/state';
import {
  LOADABLE_UCP_STATE_ATOM,
  UCPState,
} from '../../function/ucp-files/ucp-state';
import { OVERLAY_ACTIVE_ATOM } from '../overlay/overlay';
import ConfigEditor from './config-editor/config-editor';
import Overview from './overview/overview';

import Launch from './launch/launch';
import { CURRENT_DISPLAYED_TAB, UITabs } from './tabs-state';
import ExtensionManager from './extension-manager/extension-manager';
import GradientImg from '../general/gradient-img';
import {
  loadYaml,
  receiveAssetUrl,
  resolveResourcePath,
} from '../../tauri/tauri-files';
import {
  BACKGROUNDS_DIRECTORY,
  BACKGROUNDS_MAPPING_FILE,
} from '../../function/global/constants/file-constants';

const LOGGER = new Logger('ucp-taps.tsx');

interface BackgroundMapping {
  header?: string;
  tabs?: Record<UITabs, string | undefined>;
}

const DISPLAY_CONFIG_TABS_ATOM = atom(
  (get) => get(INIT_DONE) && !get(INIT_RUNNING) && !get(INIT_ERROR),
);

const BACKGROUNDS_PATH_ATOM: Atom<Promise<BackgroundMapping>> = atom(
  async () => {
    const mapping: BackgroundMapping = await resolveResourcePath([
      BACKGROUNDS_DIRECTORY,
      BACKGROUNDS_MAPPING_FILE,
    ])
      .then(loadYaml)
      .then((res) => res.getOrThrow())
      .catch((err) => {
        LOGGER.msg('Failed to load background mappings file: {}', err).error();
        return {};
      });

    // resolve paths on load
    mapping.header = !mapping.header
      ? undefined
      : await resolveResourcePath([BACKGROUNDS_DIRECTORY, mapping.header])
          .then(receiveAssetUrl)
          .catch(() => undefined);
    if (!mapping.tabs) {
      return mapping;
    }
    for (const [tab, file] of Object.entries(mapping.tabs)) {
      mapping.tabs[tab as UITabs] = !file
        ? undefined
        : await resolveResourcePath([BACKGROUNDS_DIRECTORY, file])
            .then(receiveAssetUrl)
            .catch(() => undefined);
    }
    return mapping;
  },
);

export default function UcpTabs() {
  const { t } = useTranslation(['gui-general', 'gui-editor', 'gui-launch']);

  const overlayActive = useAtomValue(OVERLAY_ACTIVE_ATOM);
  const displayConfigTabs = useAtomValue(DISPLAY_CONFIG_TABS_ATOM);
  const extensionsState = useAtomValue(EXTENSION_STATE_REDUCER_ATOM);

  const [showErrorsWarning, setShowErrorsWarning] = useState(true);

  const [advancedMode] = useAtom(GuiSettings.ADVANCED_MODE_ATOM);

  const state = useAtomValue(LOADABLE_UCP_STATE_ATOM);
  const ucpFolderExists =
    state.state === 'hasData'
      ? state.data === UCPState.ACTIVE ||
        state.data === UCPState.INACTIVE ||
        state.data === UCPState.BINK_VERSION_DIFFERENCE
      : false;

  const [currentTab, setCurrentTab] = useAtom(CURRENT_DISPLAYED_TAB);

  const backgroundMapping = useAtomValue(BACKGROUNDS_PATH_ATOM);
  const headerImage = backgroundMapping?.header ?? '';
  const tabImage = backgroundMapping?.tabs?.[currentTab] ?? '';

  return (
    <div
      className="ucp-tabs fs-7"
      {...{ inert: overlayActive ? '' : undefined }} // inert is not yet supported by React
    >
      <Tab.Container
        defaultActiveKey="overview"
        activeKey={currentTab}
        onSelect={(newKey) => setCurrentTab(newKey as UITabs)}
      >
        <Nav variant="tabs" className="ucp-tabs-header" data-tauri-drag-region>
          <GradientImg src={headerImage} basedOnWidth />

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

                  const is = extensionsState.tree.initialSolution;

                  if (is.status === 'ok') return;
                  const { messages } = is;

                  if (messages.length === 0) return;

                  await showModalOk({
                    title: 'Error: missing dependencies',
                    message: `Please be aware of the following missing dependencies:\n\n${messages.join('\n')}`,
                    handleAction: () => setShowErrorsWarning(false),
                  });

                  LOGGER.msg(
                    `Missing dependencies: ${messages.join('\n')}`,
                  ).error();
                } catch (e: any) {
                  await showModalOk({
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
          <GradientImg src={tabImage} />

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
