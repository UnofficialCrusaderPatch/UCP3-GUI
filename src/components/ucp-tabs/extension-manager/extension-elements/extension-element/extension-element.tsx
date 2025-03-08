import './extension-element.css';
import '../../buttons/customize-extension-button.css';
import '../../../../common/minimal.css';

import { useAtom, useAtomValue } from 'jotai';
import { ExclamationCircleFill } from 'react-bootstrap-icons';
import {
  AvailableExtensionVersionsDictionary,
  AVAILABLE_EXTENSION_VERSIONS_ATOM,
  PREFERRED_EXTENSION_VERSION_ATOM,
} from '../../../../../function/extensions/state/state';
import { Extension } from '../../../../../config/ucp/common';
import { setOverlayContent } from '../../../../overlay/overlay';
import {
  ExtensionViewer,
  ExtensionViewerProps,
} from '../../extension-viewer/extension-viewer';
import { customizeExtensionButtonCallback } from '../customize-extension-button-callback';
import { OverrideViewer, OverrideViewerProps } from '../override-viewer';
import { MessageType } from '../../../../../localization/localization';
import { shellOpen } from '../../../../../tauri/tauri-shell';
import { MoveArrows } from './move-arrows';
import { ArrowButton } from './arrow-button';
import { CustomizeButton } from './customize-button';
import { ShellOpenButton } from './shell-open-button';

// eslint-disable-next-line import/prefer-default-export
export function ExtensionElement(props: {
  ext: Extension;
  fixedVersion: boolean;
  active: boolean;
  movability: { up: boolean; down: boolean };
  buttonText: MessageType;
  clickCallback: () => void;
  moveCallback: (event: { name: string; type: 'up' | 'down' }) => void;
  revDeps: string[];
  displayCustomizeButton: boolean;
  displayShellOpenButton: boolean;
  showExclamationMark: boolean;
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
    displayShellOpenButton,
    showExclamationMark,
  } = props;
  const { name, version, author } = ext.definition;
  const displayName = ext.definition['display-name'];

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
          ? {
              key: 'extensions.is.dependency',
              args: { dependencies: revDeps.map((e) => `${e}`).join(', ') },
            }
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
      {showExclamationMark ? (
        <button
          type="button"
          className="minimal-button"
          onClick={() => {
            setOverlayContent<OverrideViewerProps>(OverrideViewer, true, true, {
              extension: ext,
            });
          }}
        >
          <ExclamationCircleFill style={{ color: 'gray' }} />
        </button>
      ) : null}
      {displayShellOpenButton ? (
        <ShellOpenButton
          clickCallback={() => {
            shellOpen(ext.io.path);
          }}
        />
      ) : null}
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
