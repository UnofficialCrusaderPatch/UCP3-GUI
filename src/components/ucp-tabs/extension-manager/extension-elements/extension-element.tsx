import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import {
  Button,
  Col,
  Dropdown,
  DropdownButton,
  ListGroup,
  Row,
  Tooltip,
} from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Extension } from 'config/ucp/common';
import Markdown from 'react-markdown';

import '../extension-manager.css';
import {
  useExtensionStateReducer,
  useConfigurationTouched,
  useExtensionState,
} from 'hooks/jotai/globals-wrapper';
import { useCallback } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import {
  AVAILABLE_EXTENSION_VERSIONS_ATOM,
  AvailableExtensionVersionsDictionary,
  PREFERRED_EXTENSION_VERSION_ATOM,
} from 'function/global/global-atoms';
import { useSetOverlayContent } from 'components/overlay/overlay';
import inactiveExtensionElementClickCallback from './InactiveExtensionElementClickCallback';
import warnClearingOfConfiguration from '../../common/WarnClearingOfConfiguration';
import { moveExtension } from '../extensions-state';
import activeExtensionElementClickCallback from './ActiveExtensionElementClickCallback';
import moveExtensionClickCallback from './MoveExtensionClickCallback';
import {
  ExtensionViewer,
  ExtensionViewerProps,
  MDTEST,
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
    <Col className="col-auto arrow-margin">
      <Row className="flex-column">
        <Button
          className="arrow-container"
          disabled={!movability.up}
          onClick={() => {
            if (movability.up) moveCallback({ name: ext.name, type: 'up' });
          }}
        >
          <div className="arrow up" />
        </Button>
        <Button
          className="arrow-container"
          disabled={!movability.down}
          onClick={() => {
            if (movability.down) moveCallback({ name: ext.name, type: 'down' });
          }}
        >
          <div className="arrow down" />
        </Button>
      </Row>
    </Col>
  ) : (
    // eslint-disable-next-line react/jsx-no-useless-fragment
    <></>
  );

  const enableButton = !active ? (
    <Col className="col-auto">
      <OverlayTrigger placement="left" overlay={renderTooltip}>
        <div>
          <Button
            className="fs-8 enable-arrow"
            onClick={clickCallback}
            disabled={revDeps.length > 0}
          />
        </div>
      </OverlayTrigger>
    </Col>
  ) : (
    // eslint-disable-next-line react/jsx-no-useless-fragment
    <></>
  );

  const disableButton = active ? (
    <Col className="col-auto">
      <OverlayTrigger placement="left" overlay={renderTooltip}>
        <div>
          <Button
            className="fs-8 disable-arrow"
            onClick={clickCallback}
            disabled={revDeps.length > 0}
          />
        </div>
      </OverlayTrigger>
    </Col>
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

  const dd = (
    <select
      name="cars"
      id="cars"
      className="mx-2"
      style={{
        fontSize: 'smaller',
        backgroundColor: 'transparent',
        border: 'none',
      }}
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
  );

  const setOverlayContent = useSetOverlayContent<ExtensionViewerProps>();

  return (
    <ListGroup.Item
      key={`${name}-${version}-${author}`}
      className="light-shade-item"
    >
      <Row className="align-items-center">
        {disableButton}
        <Col>
          <Row>
            <Col className="col-10">
              <span
                className="mx-2 text-secondary"
                style={{ fontSize: 'smaller' }}
              >
                -
              </span>
              {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
              <span
                className="mx-2"
                style={{ fontSize: 'smaller', cursor: 'pointer' }}
                onClick={() => {
                  setOverlayContent(ExtensionViewer, { extension: ext });
                }}
              >
                {name}
              </span>
            </Col>
            <Col className="col-2">{dd}</Col>
            {/* <Col>
                <span className="mx-2">{description || ''}</span>
               </Col> */}
          </Row>
        </Col>
        {arrows}
        {enableButton}
      </Row>
    </ListGroup.Item>
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

  const extensionsState = useExtensionState();

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

  const extensionsState = useExtensionState();

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
