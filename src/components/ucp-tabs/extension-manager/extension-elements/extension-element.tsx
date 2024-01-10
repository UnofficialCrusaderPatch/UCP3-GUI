import './extension-element.css';

import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import { Tooltip } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
  AvailableExtensionVersionsDictionary,
  AVAILABLE_EXTENSION_VERSIONS_ATOM,
  PREFERRED_EXTENSION_VERSION_ATOM,
  EXTENSION_STATE_REDUCER_ATOM,
} from '../../../../function/extensions/state/state';
import { Extension } from '../../../../config/ucp/common';
import { setOverlayContent } from '../../../overlay/overlay';
import inactiveExtensionElementClickCallback from './InactiveExtensionElementClickCallback';
import activeExtensionElementClickCallback from './ActiveExtensionElementClickCallback';
import moveExtensionClickCallback from './MoveExtensionClickCallback';
import {
  ExtensionViewer,
  ExtensionViewerProps,
} from '../extension-viewer/ExtensionViewer';

export function ExtensionElement(props: {
  ext: Extension;
  fixedVersion: boolean;
  active: boolean;
  movability: { up: boolean; down: boolean };
  buttonText: string;
  clickCallback: () => void;
  moveCallback: (event: { name: string; type: 'up' | 'down' }) => void;
  revDeps: string[];
}) {
  const {
    ext,
    fixedVersion,
    active,
    movability,
    moveCallback,
    revDeps,
    clickCallback,
  } = props;
  const { name, version, author } = ext.definition;
  const displayName = ext.definition['display-name'];

  const [t] = useTranslation(['gui-editor']);

  const renderTooltip = (p: unknown) => {
    if (revDeps.length > 0) {
      return (
        // eslint-disable-next-line react/jsx-props-no-spreading
        <Tooltip {...(p as object)}>
          {revDeps.length > 0
            ? t('gui-editor:extensions.is.dependency', {
                dependencies: revDeps.map((e) => `${e}`).join(', '),
              })
            : ''}
        </Tooltip>
      );
    }
    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <></>;
  };

  const arrows = active ? (
    <div className="arrow-container">
      <button
        type="button"
        className="arrow up"
        disabled={!movability.up}
        onClick={() => {
          if (movability.up) moveCallback({ name: ext.name, type: 'up' });
        }}
      />
      <button
        type="button"
        className="arrow down"
        disabled={!movability.down}
        onClick={() => {
          if (movability.down) moveCallback({ name: ext.name, type: 'down' });
        }}
      />
    </div>
  ) : (
    // eslint-disable-next-line react/jsx-no-useless-fragment
    <></>
  );

  const enableButton = !active ? (
    <OverlayTrigger placement="right" overlay={renderTooltip}>
      <button
        type="button"
        className="fs-8 enable-arrow"
        onClick={clickCallback}
        disabled={revDeps.length > 0}
      />
    </OverlayTrigger>
  ) : (
    // eslint-disable-next-line react/jsx-no-useless-fragment
    <></>
  );

  const disableButton = active ? (
    <OverlayTrigger placement="left" overlay={renderTooltip}>
      <button
        type="button"
        className="fs-8 disable-arrow"
        onClick={clickCallback}
        disabled={revDeps.length > 0}
      />
    </OverlayTrigger>
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
      {versionDropdown}
      {arrows}
      {enableButton}
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

  return (
    <ExtensionElement
      ext={ext}
      fixedVersion
      active
      movability={movability}
      buttonText={t('gui-general:deactivate')}
      clickCallback={clickCallback}
      moveCallback={moveCallback}
      revDeps={extensionsState.tree
        .reverseDependenciesFor(ext)
        .map((e) => e.name)
        .filter(
          (n) =>
            extensionsState.activeExtensions.map((e) => e.name).indexOf(n) !==
            -1,
        )}
    />
  );
}
