/* eslint-disable no-restricted-syntax */
/* eslint-disable no-await-in-loop */
import './ucp-tabs.css';

import { useState } from 'react';
import { Nav, Tab } from 'react-bootstrap';
import { Atom, atom, useAtom, useAtomValue, useSetAtom } from 'jotai';
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
import GradientImg from './common/gradient-img/gradient-img';
import {
  loadYaml,
  receiveAssetUrl,
  resolveResourcePath,
} from '../../tauri/tauri-files';
import {
  BACKGROUNDS_DIRECTORY,
  BACKGROUNDS_MAPPING_FILE,
} from '../../function/global/constants/file-constants';
import { useCurrentGameFolder } from '../../function/game-folder/utils';
import { ContentManager } from './content-manager/content-manager';
import {
  BUSY_CONTENT_COUNT,
  EXTENSIONS_STATE_IS_DISK_DIRTY_ATOM,
} from './content-manager/state/atoms';
import { STATUS_BAR_MESSAGE_ATOM } from '../footer/footer';
import { reloadCurrentWindow } from '../../function/window-actions';
import { showModalOkCancel } from '../modals/modal-ok-cancel';
import Text from '../general/text';

const LOGGER = new Logger('ucp-tabs.tsx');

const DISPLAY_CONFIG_TABS_ATOM = atom(
  (get) => get(INIT_DONE) && !get(INIT_RUNNING) && !get(INIT_ERROR),
);

const BACKGROUNDS_PATH_ATOM: Atom<Promise<Record<string, string | undefined>>> =
  atom(async () => {
    const mapping: Record<string, string | undefined> =
      await resolveResourcePath([
        BACKGROUNDS_DIRECTORY,
        BACKGROUNDS_MAPPING_FILE,
      ])
        .then(loadYaml)
        .then((res) => res.getOrThrow())
        .catch((err) => {
          LOGGER.msg(
            'Failed to load background mappings file: {}',
            err,
          ).error();
          return {};
        });

    // resolve paths on load
    for (const [key, file] of Object.entries(mapping)) {
      mapping[key] = !file
        ? undefined
        : await resolveResourcePath([BACKGROUNDS_DIRECTORY, file])
            .then(receiveAssetUrl)
            .catch(() => undefined);
    }
    return mapping;
  });

export default function UcpTabs() {
  const overlayActive = useAtomValue(OVERLAY_ACTIVE_ATOM);
  const initIsDoneAndWithoutErrors = useAtomValue(DISPLAY_CONFIG_TABS_ATOM);
  const extensionsState = useAtomValue(EXTENSION_STATE_REDUCER_ATOM);

  const [showErrorsWarning, setShowErrorsWarning] = useState(true);

  const [advancedMode] = useAtom(GuiSettings.ADVANCED_MODE_ATOM);

  const state = useAtomValue(LOADABLE_UCP_STATE_ATOM);
  const ucpFolderExists =
    state.state === 'hasData'
      ? state.data === UCPState.ACTIVE ||
        state.data === UCPState.INACTIVE ||
        state.data === UCPState.BINK_VERSION_DIFFERENCE ||
        state.data === UCPState.BINK_UCP_MISSING ||
        state.data === UCPState.BINK_REAL_COPY_MISSING
      : false;

  const [currentTab, setCurrentTab] = useAtom(CURRENT_DISPLAYED_TAB);

  const backgroundMapping = useAtomValue(BACKGROUNDS_PATH_ATOM);
  const headerImage = backgroundMapping?.[`header.${currentTab}`] ?? '';
  const tabImage = backgroundMapping?.[`tab.${currentTab}`] ?? '';

  const currentFolder = useCurrentGameFolder();

  const contentTabLock = useAtomValue(BUSY_CONTENT_COUNT);

  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  const isExtensionsStateDiskDirty = useAtomValue(
    EXTENSIONS_STATE_IS_DISK_DIRTY_ATOM,
  );

  return (
    <div
      className="ucp-tabs fs-7"
      {...{ inert: overlayActive ? '' : undefined }} // inert is not yet supported by React
    >
      <Tab.Container
        defaultActiveKey="overview"
        activeKey={currentTab}
        onSelect={(newKey) => {
          LOGGER.msg(`Selected tab: ${newKey}`).debug();
          setCurrentTab(newKey as UITabs);
        }}
      >
        <Nav variant="tabs" className="ucp-tabs-header" data-tauri-drag-region>
          <GradientImg src={headerImage} type="header" />

          <Nav.Item>
            <Nav.Link
              eventKey="overview"
              className="ornament-border-button tab-link"
            >
              <Text message="overview.title" />
            </Nav.Link>
          </Nav.Item>
          <Nav.Item
            onMouseEnter={() => {
              if (contentTabLock > 0) {
                setStatusBarMessage(
                  `Some content is still processing, please wait until finished. Waiting for ... ${contentTabLock}`,
                );
              }
            }}
            onMouseLeave={() => {
              setStatusBarMessage(undefined);
            }}
          >
            <Nav.Link
              eventKey="extensions"
              className="ornament-border-button tab-link"
              disabled={!initIsDoneAndWithoutErrors || contentTabLock > 0}
              hidden={!ucpFolderExists}
              onClick={async () => {
                try {
                  if (!showErrorsWarning) {
                    return;
                  }

                  if (isExtensionsStateDiskDirty) {
                    const okCancelResult = await showModalOkCancel({
                      title: 'GUI restart required',
                      message:
                        "The GUI needs to restart as content needs to be reloaded from disk.\n\nIf you don't want to reload, click cancel",
                    });
                    if (okCancelResult) {
                      await reloadCurrentWindow();
                    }

                    return;
                  }

                  const is = extensionsState.tree.initialSolution;

                  if (is.status === 'ok') return;
                  const { messages } = is;

                  if (messages.length === 0) return;

                  await showModalOk({
                    title: 'Error: missing dependencies',
                    message: `Please be aware of the following missing dependencies:\n\n${messages.join('\n')}\n\nTry installing them by visiting the Store`,
                    handleAction: () => setShowErrorsWarning(false),
                  });

                  LOGGER.msg(
                    `Missing dependencies: ${messages.join('\n')}`,
                  ).error();
                } catch (e: unknown) {
                  await showModalOk({
                    title: 'ERROR',
                    message: String(e),
                  });
                }
              }}
            >
              <Text message="extensions.title" />
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              eventKey="config"
              className="ornament-border-button tab-link"
              disabled={!initIsDoneAndWithoutErrors}
              hidden={!advancedMode || !ucpFolderExists}
            >
              <Text message="config.title" />
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              eventKey="content-manager"
              className="ornament-border-button tab-link"
              disabled={currentFolder === ''}
              hidden={currentFolder === ''}
            >
              Store
            </Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link
              eventKey="launch"
              className="ornament-border-button tab-link"
              disabled={currentFolder === ''}
              hidden={currentFolder === ''}
            >
              <Text message="launch" />
            </Nav.Link>
          </Nav.Item>
        </Nav>
        <Tab.Content className="ornament-border">
          <GradientImg src={tabImage} type="tab" />

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
          <Tab.Pane eventKey="content-manager" className="tab-panel">
            <ContentManager />
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>
    </div>
  );
}
