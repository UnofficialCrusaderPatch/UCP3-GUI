import './extension-manager.css';

import { useTranslation } from 'react-i18next';

import { atom, useAtom, useAtomValue } from 'jotai';
import { Event, listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { FileDropEvent } from '@tauri-apps/api/window';
import * as GuiSettings from '../../../function/gui-settings/settings';
import { EXTENSION_STATE_REDUCER_ATOM } from '../../../function/extensions/state/state';
import {
  ActiveExtensionElement,
  CustomisationsExtensionElement,
  ExtensionNameList,
  GhostElement,
  InactiveExtensionsElement,
} from './extension-elements/extension-element';
import { FilterButton } from './buttons/filter-button';
import {
  InstallExtensionButton,
  installExtensionsButtonCallback,
} from './buttons/install-extensions-button';
import { EXTENSION_EDITOR_STATE_ATOM } from '../common/extension-editor/extension-editor-state';
import { CONFIGURATION_USER_REDUCER_ATOM } from '../../../function/configuration/state';
import { ExtensionManagerToolbar } from './toolbar-extension-manager';
import { EditorExtensionManagerToolbar } from './toolbar-extension-manager-editor-mode';
import { ConsoleLogger } from '../../../util/scripts/logging';
import { getStore } from '../../../hooks/jotai/base';
import { GAME_FOLDER_ATOM } from '../../../function/game-folder/game-folder-atom';
import { showModalOkCancel } from '../../modals/modal-ok-cancel';
import { CURRENT_DISPLAYED_TAB } from '../tabs-state';
import { showModalOk } from '../../modals/modal-ok';
import { reloadCurrentWindow } from '../../../function/window-actions';
import { makeToast } from '../../toasts/toasts-display';

const HAS_CUSTOMISATIONS = atom(
  (get) => Object.entries(get(CONFIGURATION_USER_REDUCER_ATOM)).length > 0,
);

const EXPECTING_DROP = atom(false);
// const HANDLED_DROP_EVENTS = atom<{ [id: number]: boolean }>({});

const handleFileDrop = async (event: Event<unknown>) => {
  if (event.event !== 'tauri://file-drop') return;
  if (getStore().get(CURRENT_DISPLAYED_TAB) === 'extensions') {
    ConsoleLogger.debug('Drop event: ', event);
    try {
      let anythingInstalled = false;
      // eslint-disable-next-line no-restricted-syntax
      for (const path of event.payload as string[]) {
        // eslint-disable-next-line no-await-in-loop
        const answer = await showModalOkCancel({
          title: 'Install extension?',
          message: `Install extensions? ${path}`,
        });
        // eslint-disable-next-line no-continue
        if (!answer) continue;

        makeToast({
          title: `Installing extension...`,
          body: `Installing in the background`,
        });

        // eslint-disable-next-line no-await-in-loop
        await installExtensionsButtonCallback(
          getStore().get(GAME_FOLDER_ATOM),
          path,
        );

        // makeToast({
        //   title: `Installed!`,
        //   body: `Installation of extension complete`,
        // });

        anythingInstalled = true;
      }

      if (anythingInstalled) {
        await showModalOk({
          title: 'Reload required',
          message: 'The GUI will now reload.',
        });

        reloadCurrentWindow();
      }
    } catch (err: any) {
      ConsoleLogger.error(err);
    }
  }
};

export default function ExtensionManager() {
  const extensionsState = useAtomValue(EXTENSION_STATE_REDUCER_ATOM);

  const [t] = useTranslation(['gui-general', 'gui-editor']);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const extensionEditorState = useAtomValue(EXTENSION_EDITOR_STATE_ATOM);

  const showAllExtensions = useAtomValue(GuiSettings.SHOW_ALL_EXTENSIONS_ATOM);

  const displayedActiveExtensions = showAllExtensions
    ? extensionsState.activeExtensions
    : extensionsState.activeExtensions.filter(
        (e) => !(e.type === 'module' && e.ui.length === 0),
      );

  const activeExtensionNames = displayedActiveExtensions.map((ext) => ext.name);

  const extensionsToDisplay = (
    showAllExtensions
      ? extensionsState.extensions
      : extensionsState.extensions.filter(
          (e) => !(e.type === 'module' && e.ui.length === 0),
        )
  ).filter((ext) => activeExtensionNames.indexOf(ext.name) === -1);

  const extensionsToDisplayByName = Array.from(
    new Set(extensionsToDisplay.map((e) => e.name)),
  ).map(
    (n) =>
      ({
        name: n,
        extensions: extensionsState.extensions.filter((e) => e.name === n),
      }) as ExtensionNameList,
  );
  const eUI = extensionsToDisplayByName
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((enl) => (
      <InactiveExtensionsElement
        key={`inactive-extension-element-${enl.name}`}
        exts={enl.extensions}
      />
    ));

  const activated = displayedActiveExtensions.map((ext, index, arr) => (
    <ActiveExtensionElement
      key={`active-extension-element-${ext.name}-${ext.version}`}
      ext={ext}
      index={index}
      arr={arr}
    />
  ));

  const a = extensionsState.extensions.length;
  const b = extensionsToDisplay.length + displayedActiveExtensions.length;

  const filterInfoElement = !showAllExtensions ? (
    <span className="fs-8">
      {t('gui-editor:config.filter', { all: a, displayed: b })}
    </span>
  ) : (
    <span />
  );

  const hasCustomisations = useAtomValue(HAS_CUSTOMISATIONS);
  const editorState = useAtomValue(EXTENSION_EDITOR_STATE_ATOM);
  const displayCustomisationsElement =
    hasCustomisations && editorState.state === 'inactive';

  const displayGhostElement = editorState.state === 'active';

  const [expectingDrop, setExpectingDrop] = useAtom(EXPECTING_DROP);

  useEffect(() => {
    const unlisten = listen<FileDropEvent>(
      'tauri://file-drop',
      async (event) => {
        await handleFileDrop(event);
      },
    );

    // invoke a Rust function to start a loop for periodically emitting event.
    // do something

    return () => {
      unlisten.then((f) => f()).catch((err) => ConsoleLogger.error(err));
    };
  }, []);

  useEffect(() => {
    const unlisten = listen<FileDropEvent>(
      'tauri://file-drop-hover',
      async () => {
        setExpectingDrop(true);
      },
    );

    // invoke a Rust function to start a loop for periodically emitting event.
    // do something

    return () => {
      unlisten.then((f) => f()).catch((err) => ConsoleLogger.error(err));
    };
  }, [setExpectingDrop]);

  useEffect(() => {
    const unlisten = listen<FileDropEvent>(
      'tauri://file-drop-cancelled',
      async () => {
        setExpectingDrop(false);
      },
    );

    // invoke a Rust function to start a loop for periodically emitting event.
    // do something

    return () => {
      unlisten.then((f) => f()).catch((err) => ConsoleLogger.error(err));
    };
  }, [setExpectingDrop]);

  return (
    <div className="flex-default extension-manager">
      <div className="extension-manager-control">
        <div className="extension-manager-control__header-container">
          <div className="extension-manager-control__header">
            <h4 className="extension-manager-control__box__header__headline">
              {t('gui-editor:extensions.available')}
            </h4>
            <div className="extension-manager-control__box__header__buttons">
              {filterInfoElement}
              <FilterButton />
              <InstallExtensionButton />
            </div>
          </div>
          <div className="extension-manager-control__header">
            <h4 className="extension-manager-control__box__header__headline">
              {t('gui-editor:extensions.activated')}
            </h4>
          </div>
        </div>
        <div className="extension-manager-control__box-container">
          <div className="extension-manager-control__box">
            <div className="parchment-box extension-manager-list">
              {expectingDrop ? (
                <div
                  className="d-flex text-dark justify-content-center fs-4 align-self-center"
                  style={{ width: '100%', height: '100%' }}
                >
                  Drop file here to install extension
                </div>
              ) : (
                eUI
              )}
            </div>
          </div>
          <div className="extension-manager-control__box">
            <div className="parchment-box extension-manager-list">
              {[
                displayCustomisationsElement ? (
                  <CustomisationsExtensionElement key="user-customiastions" />
                ) : undefined,
                displayGhostElement ? (
                  <GhostElement
                    key={`${editorState.extension.name}-${editorState.extension.version}`}
                    ext={editorState.extension}
                  />
                ) : undefined,
                ...activated,
              ]}
            </div>
            {editorState.state === 'inactive' ? (
              <ExtensionManagerToolbar />
            ) : (
              <EditorExtensionManagerToolbar />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
