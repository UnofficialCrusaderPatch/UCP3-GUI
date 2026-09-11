/* eslint-disable jsx-a11y/no-static-element-interactions */
/* eslint-disable jsx-a11y/click-events-have-key-events */
import './extension-manager.css';

import { atom, useAtom, useAtomValue } from 'jotai';
import { listen } from '@tauri-apps/api/event';
import { useEffect } from 'react';
import { FileDropEvent } from '@tauri-apps/api/window';
import * as GuiSettings from '../../../function/gui-settings/settings';
import {
  EXTENSION_STATE_REDUCER_ATOM,
  PREFERRED_EXTENSION_VERSION_ATOM,
  AVAILABLE_EXTENSION_VERSIONS_ATOM,
} from '../../../function/extensions/state/state';
import { CreatorModeButton } from '../config-editor/buttons/creator-mode-button';
import { InstallExtensionButton } from './buttons/install-extensions-button';
import { EXTENSION_EDITOR_STATE_ATOM } from '../common/extension-editor/extension-editor-state';
import { CONFIGURATION_USER_REDUCER_ATOM } from '../../../function/configuration/state';
import { ExtensionManagerToolbar } from './toolbar-extension-manager';
import { EditorExtensionManagerToolbar } from './toolbar-extension-manager-editor-mode';
import { ConsoleLogger } from '../../../util/scripts/logging';
import { IS_FILE_DRAGGING, handleFileDrop } from './drag-drop/drop-handling';
import { CURRENT_DISPLAYED_TAB } from '../tabs-state';
import Message from '../../general/message';
import { ActiveExtensionElement } from './extension-elements/extension-element/active-extension-element';
import { CustomisationsExtensionElement } from './extension-elements/extension-element/customisations-element';
import { GhostElement } from './extension-elements/extension-element/ghost-element';
import { InactiveExtensionsElement } from './extension-elements/extension-element/inactive-extension-element';
import { Extension } from '../../../config/ucp/common';
import { CONTENT_ELEMENTS_ATOM } from '../content-manager/state/atoms';
import {
  DiscoveryFilter,
  EMPTY_DISCOVERY_FILTER,
} from '../../../function/content/discovery/search';
import {
  DiscoverySearch,
  DiscoveryFilterButton,
} from '../common/discovery/discovery-toolbar';
import { FamilyList } from '../common/discovery/family-list';
import { useDiscovery } from '../common/discovery/use-discovery';
import { createExtensionID } from '../../../function/global/constants/extension-id';
import { SearchExcerpt } from '../common/discovery/search-excerpt';
import { OpenExtensionsFolderButton } from './extension-elements/extension-element/shell-open-button';

export const EXTENSION_DISCOVERY_FILTER = atom<DiscoveryFilter>(
  EMPTY_DISCOVERY_FILTER,
);

const HAS_CUSTOMISATIONS = atom(
  (get) => Object.entries(get(CONFIGURATION_USER_REDUCER_ATOM)).length > 0,
);

export default function ExtensionManager() {
  const extensionsState = useAtomValue(EXTENSION_STATE_REDUCER_ATOM);
  const [discoveryFilter, setDiscoveryFilter] = useAtom(
    EXTENSION_DISCOVERY_FILTER,
  );
  const contentElements = useAtomValue(CONTENT_ELEMENTS_ATOM);
  const discovery = useDiscovery(contentElements, discoveryFilter);
  const preferredVersions = useAtomValue(PREFERRED_EXTENSION_VERSION_ATOM);
  const availableVersions = useAtomValue(AVAILABLE_EXTENSION_VERSIONS_ATOM);

  const [showAllExtensions, setShowAllExtensions] = useAtom(
    GuiSettings.SHOW_ALL_EXTENSIONS_ATOM,
  );

  const displayedActiveExtensions = showAllExtensions
    ? extensionsState.activeExtensions
    : extensionsState.activeExtensions.filter((e) => e.type !== 'module');

  const activeExtensionNames = displayedActiveExtensions.map((ext) => ext.name);

  const extensionsToDisplay = (
    showAllExtensions
      ? extensionsState.extensions
      : extensionsState.extensions.filter((e) => e.type !== 'module')
  ).filter((ext) => activeExtensionNames.indexOf(ext.name) === -1);

  const preferred = (name: string) =>
    extensionsState.activeExtensions.find((ext) => ext.name === name) ??
    extensionsState.extensions.find(
      (ext) =>
        ext.name === name &&
        ext.version ===
          (preferredVersions[name] ?? availableVersions[name]?.[0]),
    );
  const available = [
    ...new Set(extensionsState.extensions.map((ext) => ext.name)),
  ]
    .map(preferred)
    .filter((ext): ext is Extension => ext !== undefined);
  const item = (ext: Extension) => ({
    id: createExtensionID(ext),
    name: ext.name,
    ext,
    active: extensionsState.activeExtensions.some(
      (active) => createExtensionID(active) === createExtensionID(ext),
    ),
    family:
      contentElements.find(
        (element) => createExtensionID(element) === createExtensionID(ext),
      )?.definition.family ?? ext.definition.family,
  });
  const renderExtension = ({ ext }: { ext: Extension }) => {
    const index = extensionsState.activeExtensions.findIndex(
      (active) => createExtensionID(active) === createExtensionID(ext),
    );
    const hit = discovery.results.get(createExtensionID(ext));
    return (
      <>
        {index >= 0 ? (
          <div className="discovery-active-row">
            <span className="discovery-priority">{index + 1}</span>
            <ActiveExtensionElement
              ext={ext}
              index={index}
              arr={extensionsState.activeExtensions}
            />
          </div>
        ) : (
          <InactiveExtensionsElement
            exts={extensionsState.extensions.filter(
              (entry) => entry.name === ext.name,
            )}
          />
        )}
        {hit && (hit.excerpt || hit.approximate) && (
          <SearchExcerpt
            text={hit.excerpt}
            query={discoveryFilter.search}
            approximate={hit.approximate}
          />
        )}
      </>
    );
  };
  const searching = Boolean(
    discoveryFilter.search.trim() || discoveryFilter.tags.length,
  );
  const availableNames = new Set(extensionsToDisplay.map((ext) => ext.name));
  const visibleInactive = available
    .filter(
      (ext) =>
        availableNames.has(ext.name) &&
        discovery.results.has(createExtensionID(ext)),
    )
    .sort(
      (left, right) =>
        discovery.results.get(createExtensionID(right))!.score -
          discovery.results.get(createExtensionID(left))!.score ||
        left.name.localeCompare(right.name),
    );
  const eUI = (
    <FamilyList
      items={visibleInactive.map(item)}
      available={available
        .filter((ext) => showAllExtensions || ext.type !== 'module')
        .map(item)}
      scope="content-inactive"
      searching={searching}
      render={renderExtension}
      label={({ ext }) => ext.definition['display-name'] || ext.name}
    />
  );
  const activated = (
    <FamilyList
      key="active-families"
      items={displayedActiveExtensions
        .filter((ext) => discovery.results.has(createExtensionID(ext)))
        .map(item)}
      available={available
        .filter((ext) => showAllExtensions || ext.type !== 'module')
        .map(item)}
      scope="content-active"
      searching={searching}
      render={renderExtension}
      label={({ ext }) => ext.definition['display-name'] || ext.name}
    />
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
              <Message message="extensions.available" />
            </h4>
            <div className="extension-manager-control__box__header__buttons">
              <DiscoveryFilterButton
                filter={discoveryFilter}
                onChange={setDiscoveryFilter}
                tags={discovery.tags}
                excludeModules={!showAllExtensions}
                onExcludeModules={(exclude) => setShowAllExtensions(!exclude)}
              />
              <CreatorModeButton />
              <OpenExtensionsFolderButton />
              <InstallExtensionButton />
            </div>
          </div>
          <div className="extension-manager-control__header">
            <h4 className="extension-manager-control__box__header__headline">
              <Message message="extensions.activated" />
            </h4>
          </div>
        </div>
        <div className="extension-manager-control__box-container">
          <div className="extension-manager-control__box">
            <div className="parchment-box extension-manager-list">{eUI}</div>
            <DiscoverySearch
              filter={discoveryFilter}
              onChange={setDiscoveryFilter}
              pending={discovery.pending}
              incomplete={discovery.incomplete}
            />
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
                activated,
              ]}
            </div>
            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.75)',
                paddingLeft: '10px',
              }}
            >
              <Message message="extensions.priority.note" />
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
