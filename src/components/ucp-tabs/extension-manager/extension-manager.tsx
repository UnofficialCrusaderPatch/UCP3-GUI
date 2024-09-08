/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './extension-manager.css';

import { atom, useAtom, useAtomValue } from 'jotai';
import { listen } from '@tauri-apps/api/event';
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
import { InstallExtensionButton } from './buttons/install-extensions-button';
import { EXTENSION_EDITOR_STATE_ATOM } from '../common/extension-editor/extension-editor-state';
import { CONFIGURATION_USER_REDUCER_ATOM } from '../../../function/configuration/state';
import { ExtensionManagerToolbar } from './toolbar-extension-manager';
import { EditorExtensionManagerToolbar } from './toolbar-extension-manager-editor-mode';
import { ConsoleLogger } from '../../../util/scripts/logging';
import { IS_FILE_DRAGGING, handleFileDrop } from './drag-drop/drop-handling';
import { CURRENT_DISPLAYED_TAB } from '../tabs-state';
import Text from '../../general/text';

const HAS_CUSTOMISATIONS = atom(
  (get) => Object.entries(get(CONFIGURATION_USER_REDUCER_ATOM)).length > 0,
);

export default function ExtensionManager() {
  const extensionsState = useAtomValue(EXTENSION_STATE_REDUCER_ATOM);

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
      <Text
        message={{
          key: 'config.filtered',
          args: { all: a, displayed: b },
        }}
      />
    </span>
  ) : (
    <span />
  );

  const hasCustomisations = useAtomValue(HAS_CUSTOMISATIONS);
  const editorState = useAtomValue(EXTENSION_EDITOR_STATE_ATOM);
  const displayCustomisationsElement =
    hasCustomisations && editorState.state === 'inactive';

  const displayGhostElement = editorState.state === 'active';

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isFileDragging, setIsFileDragging] = useAtom(IS_FILE_DRAGGING);

  const currentTab = useAtomValue(CURRENT_DISPLAYED_TAB);

  useEffect(() => {
    const unlisten = listen<FileDropEvent>(
      'tauri://file-drop',
      async (event) => {
        try {
          await handleFileDrop(event);
        } catch (e: unknown) {
          ConsoleLogger.error(e);
        }
      },
    );

    // invoke a Rust function to start a loop for periodically emitting event.
    // do something

    return () => {
      unlisten.then((f) => f()).catch((err) => ConsoleLogger.error(err));
    };
  }, []);

  useEffect(() => {
    const unlisten = listen<FileDropEvent>('tauri://file-drop-hover', () => {
      if (currentTab === 'extensions') {
        ConsoleLogger.debug('set expecting drop to: ', true);
        setIsFileDragging(true);
      }
    });

    // invoke a Rust function to start a loop for periodically emitting event.
    // do something

    return () => {
      unlisten.then((f) => f()).catch((err) => ConsoleLogger.error(err));
    };
  }, [setIsFileDragging, currentTab]);

  useEffect(() => {
    const unlisten = listen<FileDropEvent>(
      'tauri://file-drop-cancelled',
      () => {
        ConsoleLogger.debug('set expecting drop to: ', false);
        setIsFileDragging(false);
      },
    );

    // invoke a Rust function to start a loop for periodically emitting event.
    // do something

    return () => {
      unlisten.then((f) => f()).catch((err) => ConsoleLogger.error(err));
    };
  }, [setIsFileDragging]);

  return (
    <div className="flex-default extension-manager">
      <div className="extension-manager-control">
        <div className="extension-manager-control__header-container">
          <div className="extension-manager-control__header">
            <h4 className="extension-manager-control__box__header__headline">
              <Text message="extensions.available" />
            </h4>
            <div className="extension-manager-control__box__header__buttons">
              {filterInfoElement}
              <FilterButton />
              <InstallExtensionButton />
            </div>
          </div>
          <div className="extension-manager-control__header">
            <h4 className="extension-manager-control__box__header__headline">
              <Text message="extensions.activated" />
            </h4>
          </div>
        </div>
        <div className="extension-manager-control__box-container">
          <div className="extension-manager-control__box">
            <div className="parchment-box extension-manager-list">{eUI}</div>
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
