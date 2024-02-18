import './extension-element.css';
import '../buttons/customize-extension-button.css';

import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { GearFill, TrashFill } from 'react-bootstrap-icons';
import {
  AvailableExtensionVersionsDictionary,
  AVAILABLE_EXTENSION_VERSIONS_ATOM,
  PREFERRED_EXTENSION_VERSION_ATOM,
  EXTENSION_STATE_REDUCER_ATOM,
  EXTENSION_STATE_INTERFACE_ATOM,
} from '../../../../function/extensions/state/state';
import { Extension } from '../../../../config/ucp/common';
import { setOverlayContent } from '../../../overlay/overlay';
import inactiveExtensionElementClickCallback from './inactive-extension-element-click-callback';
import activeExtensionElementClickCallback from './active-extension-element-click-callback';
import moveExtensionClickCallback from './move-extension-click-callback';
import {
  ExtensionViewer,
  ExtensionViewerProps,
} from '../extension-viewer/extension-viewer';
import { STATUS_BAR_MESSAGE_ATOM } from '../../../footer/footer';
import { CONFIGURATION_USER_REDUCER_ATOM } from '../../../../function/configuration/state';
import { CREATOR_MODE_ATOM } from '../../../../function/gui-settings/settings';
import { customizeExtensionButtonCallback } from './customize-extension-button-callback';

function MoveArrows(props: {
  extensionName: string;
  movability: { up: boolean; down: boolean };
  moveCallback: (event: { name: string; type: 'up' | 'down' }) => void;
}) {
  const { extensionName, movability, moveCallback } = props;
  return (
    <div className="arrow-container">
      <button
        type="button"
        className="arrow up"
        disabled={!movability.up}
        onClick={() => {
          if (movability.up) moveCallback({ name: extensionName, type: 'up' });
        }}
      />
      <button
        type="button"
        className="arrow down"
        disabled={!movability.down}
        onClick={() => {
          if (movability.down)
            moveCallback({ name: extensionName, type: 'down' });
        }}
      />
    </div>
  );
}

function ArrowButton(props: {
  clickCallback: () => void;
  disabled: boolean;
  buttonText: string;
  className: string;
}) {
  const { clickCallback, disabled, buttonText, className } = props;
  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);
  return (
    <button
      type="button"
      className={`fs-8 ${className}`}
      onClick={clickCallback}
      disabled={disabled}
      onPointerEnter={() => {
        setStatusBarMessage(buttonText);
      }}
      onPointerLeave={() => {
        setStatusBarMessage(undefined);
      }}
    />
  );
}

function CustomizeButton(props: { clickCallback: () => void }) {
  const { clickCallback } = props;
  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);
  return (
    <button
      type="button"
      className="fs-8 customize-extension-button"
      onClick={clickCallback}
      onPointerEnter={() => {
        setStatusBarMessage('Modify this extension');
      }}
      onPointerLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
      <span>
        <GearFill />
      </span>
    </button>
  );
}

export function ExtensionElement(props: {
  ext: Extension;
  fixedVersion: boolean;
  active: boolean;
  movability: { up: boolean; down: boolean };
  buttonText: string;
  clickCallback: () => void;
  moveCallback: (event: { name: string; type: 'up' | 'down' }) => void;
  revDeps: string[];
  displayCustomizeButton: boolean;
}) {
  const {
    ext,
    fixedVersion,
    active,
    movability,
    moveCallback,
    revDeps,
    clickCallback,
    buttonText,
    displayCustomizeButton,
  } = props;
  const { name, version, author } = ext.definition;
  const displayName = ext.definition['display-name'];

  const [t] = useTranslation(['gui-editor']);

  const arrows = active ? (
    <MoveArrows
      extensionName={ext.name}
      movability={movability}
      moveCallback={moveCallback}
    />
  ) : (
    // eslint-disable-next-line react/jsx-no-useless-fragment
    <></>
  );

  const enableButton = !active ? (
    <ArrowButton
      className="enable-arrow"
      clickCallback={clickCallback}
      buttonText={buttonText}
      disabled={revDeps.length > 0}
    />
  ) : (
    // eslint-disable-next-line react/jsx-no-useless-fragment
    <></>
  );

  const disableButton = active ? (
    <ArrowButton
      className="disable-arrow"
      clickCallback={clickCallback}
      buttonText={
        revDeps.length > 0
          ? t('gui-editor:extensions.is.dependency', {
              dependencies: revDeps.map((e) => `${e}`).join(', '),
            })
          : buttonText
      }
      disabled={revDeps.length > 0}
    />
  ) : (
    // eslint-disable-next-line react/jsx-no-useless-fragment
    <></>
  );

  const versions: AvailableExtensionVersionsDictionary = useAtomValue(
    AVAILABLE_EXTENSION_VERSIONS_ATOM,
  );

  const availableVersions = fixedVersion
    ? versions[name].filter((v) => v === ext.version)
    : versions[name];

  const [preferredVersions, setPreferredVersions] = useAtom(
    PREFERRED_EXTENSION_VERSION_ATOM,
  );

  const preferredVersion =
    preferredVersions[name] === undefined
      ? availableVersions[0]
      : preferredVersions[name];

  const versionDropdown = (
    <div>
      <select
        className="extension-version-dropdown"
        disabled={fixedVersion}
        value={preferredVersion}
        onChange={(event) => {
          const newValue = event.target.value;
          preferredVersions[name] = newValue;
          setPreferredVersions({ ...preferredVersions });
        }}
      >
        {availableVersions.map((v) => (
          <option key={`${name}-${v}`} value={v}>
            {v}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <div key={`${name}-${version}-${author}`} className="extension-element">
      {disableButton}
      <div className="extension-name-box">
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <span
          className="extension-name-box__name"
          onClick={() => {
            setOverlayContent<ExtensionViewerProps>(
              ExtensionViewer,
              true,
              true,
              { extension: ext },
            );
          }}
        >
          {displayName}
        </span>
      </div>
      {displayCustomizeButton ? (
        <CustomizeButton
          clickCallback={() => customizeExtensionButtonCallback(ext)}
        />
      ) : (
        // eslint-disable-next-line react/jsx-no-useless-fragment
        <></>
      )}
      {versionDropdown}
      {arrows}
      {enableButton}
    </div>
  );
}

export function CustomisationsExtensionElement() {
  const [t] = useTranslation(['gui-editor']);

  const setUserConfig = useSetAtom(CONFIGURATION_USER_REDUCER_ATOM);

  const setStatusBarMessage = useSetAtom(STATUS_BAR_MESSAGE_ATOM);

  const [extensionsState, setExtensionsState] = useAtom(
    EXTENSION_STATE_INTERFACE_ATOM,
  );

  const trashButton = (
    <button
      type="button"
      className="fs-8 disable-arrow-trash-button"
      onClick={() => {
        setUserConfig({ type: 'clear-all' });
        setExtensionsState({ ...extensionsState });
      }}
      onPointerEnter={() => {
        setStatusBarMessage('Clear customisations');
      }}
      onPointerLeave={() => {
        setStatusBarMessage(undefined);
      }}
    >
      <TrashFill />
    </button>
  );

  return (
    <div key="user-customisations" className="extension-element">
      {trashButton}
      <div className="extension-name-box">
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <span className="extension-name-box__name">{t('Customisations')}</span>
      </div>
    </div>
  );
}

export function InactiveExtensionsElement(props: { exts: Extension[] }) {
  const { exts } = props;

  const { name } = exts[0];

  const versions: AvailableExtensionVersionsDictionary = useAtomValue(
    AVAILABLE_EXTENSION_VERSIONS_ATOM,
  );

  const availableVersions = versions[name];

  const preferredVersions = useAtomValue(PREFERRED_EXTENSION_VERSION_ATOM);

  const preferredVersion =
    preferredVersions[name] === undefined
      ? availableVersions[0]
      : preferredVersions[name];

  const ext = exts.filter((e) => e.version === preferredVersion)[0];

  const extensionsState = useAtomValue(EXTENSION_STATE_REDUCER_ATOM);

  const clickCallback = useCallback(
    () => inactiveExtensionElementClickCallback(ext),
    [ext],
  );

  const [t] = useTranslation(['gui-editor']);

  const revDeps = extensionsState.tree.reverseDependenciesFor(ext);

  return (
    <ExtensionElement
      ext={ext}
      fixedVersion={false}
      active={false}
      movability={{ up: false, down: false }}
      buttonText={t('gui-general:activate')}
      clickCallback={clickCallback}
      moveCallback={() => {}}
      revDeps={revDeps
        .map((e) => e.name)
        .filter(
          (n) =>
            extensionsState.activeExtensions.map((e) => e.name).indexOf(n) !==
            -1,
        )}
      displayCustomizeButton={false}
    />
  );
}

export type ExtensionNameList = {
  name: string;
  extensions: Extension[];
};

export function ActiveExtensionElement(props: {
  ext: Extension;
  index: number;
  arr: Extension[];
}) {
  const { ext, index, arr } = props;

  const extensionsState = useAtomValue(EXTENSION_STATE_REDUCER_ATOM);

  const revDeps = extensionsState.tree
    .reverseDependenciesFor(ext)
    .map((e) => e.name);
  const depsFor = extensionsState.tree
    .directDependenciesFor(ext)
    .map((e) => e.name);

  const movability = {
    up: index > 0 && revDeps.indexOf(arr[index - 1].name) === -1,
    down: index < arr.length - 1 && depsFor.indexOf(arr[index + 1].name) === -1,
  };

  const [t] = useTranslation(['gui-editor']);

  const clickCallback = useCallback(
    () => activeExtensionElementClickCallback(ext),
    [ext],
  );

  const moveCallback = useCallback(
    (event: { name: string; type: 'up' | 'down' }) =>
      moveExtensionClickCallback(event),
    [],
  );

  const theRevDeps = extensionsState.tree
    .reverseDependenciesFor(ext)
    .map((e) => e.name)
    .filter(
      (n) =>
        extensionsState.activeExtensions.map((e) => e.name).indexOf(n) !== -1,
    );

  const guiCreatorMode = useAtomValue(CREATOR_MODE_ATOM);

  return (
    <ExtensionElement
      ext={ext}
      fixedVersion
      active
      movability={movability}
      buttonText={t('gui-general:deactivate')}
      clickCallback={clickCallback}
      moveCallback={moveCallback}
      displayCustomizeButton={
        guiCreatorMode && ext.type === 'plugin' && theRevDeps.length === 0
      }
      revDeps={theRevDeps}
    />
  );
}
