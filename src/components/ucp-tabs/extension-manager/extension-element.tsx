import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import { Button, Col, ListGroup, Row, Tooltip } from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Extension } from 'config/ucp/common';

import './extension-manager.css';
import {
  useExtensionStateReducer,
  useGeneralOkayCancelModalWindowReducer,
  useSetConfigurationLocks,
  useSetConfigurationDefaults,
  useConfigurationTouched,
  useSetConfigurationTouched,
  useSetConfigurationWarnings,
  useSetConfiguration,
} from 'hooks/jotai/globals-wrapper';
import { ExtensionsState } from 'function/global/types';
import inactiveExtensionElementClickCallback from './InactiveExtensionElementClickCallback';
import warnClearingOfConfiguration from '../common/WarnClearingOfConfiguration';
import {
  removeExtensionFromExplicitlyActivatedExtensions,
  moveExtension,
} from './extensions-state';

export function ExtensionElement(props: {
  ext: Extension;
  active: boolean;
  movability: { up: boolean; down: boolean };
  buttonText: string;
  clickCallback: () => void;
  moveCallback: (event: { name: string; type: 'up' | 'down' }) => void;
  revDeps: Extension[];
}) {
  const { ext, active, movability, moveCallback, revDeps, clickCallback } =
    props;
  const { name, version, author } = ext.definition;

  const [t] = useTranslation(['gui-editor']);

  const renderTooltip = (p: unknown) => {
    if (revDeps.length > 0) {
      return (
        // eslint-disable-next-line react/jsx-props-no-spreading
        <Tooltip {...(p as object)}>
          {revDeps.length > 0
            ? t('gui-editor:extensions.is.dependency', {
                dependencies: revDeps
                  .map((e) => `${e.name}@${e.version}`)
                  .join(', '),
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

  return (
    <ListGroup.Item
      key={`${name}-${version}-${author}`}
      className="light-shade-item"
    >
      <Row className="align-items-center">
        {disableButton}
        <Col>
          <Row>
            {/* <Col className="col-2">
                <span className="mx-2">{displayName || name}</span>
              </Col> */}
            <Col className="col-12">
              <span className="mx-2 text-secondary">-</span>
              <span className="mx-2" style={{ fontSize: 'smaller' }}>
                {name}-{version}
              </span>
            </Col>
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

export function InactiveExtensionElement(props: { ext: Extension }) {
  const { ext } = props;
  const [extensionsState, setExtensionsState] = useExtensionStateReducer();

  const [generalOkCancelModalWindow, setGeneralOkCancelModalWindow] =
    useGeneralOkayCancelModalWindowReducer();

  const setConfigurationLocks = useSetConfigurationLocks();

  const setConfigurationDefaults = useSetConfigurationDefaults();

  const setConfiguration = useSetConfiguration();

  // currently simply reset:
  const configurationTouched = useConfigurationTouched();
  const setConfigurationTouched = useSetConfigurationTouched();
  const setConfigurationWarnings = useSetConfigurationWarnings();

  const clickCallback = () =>
    inactiveExtensionElementClickCallback(
      configurationTouched,
      generalOkCancelModalWindow,
      setGeneralOkCancelModalWindow,
      extensionsState,
      ext,
      setExtensionsState,
      setConfiguration,
      setConfigurationDefaults,
      setConfigurationTouched,
      setConfigurationWarnings,
      setConfigurationLocks
    );

  const [t] = useTranslation(['gui-editor']);

  const revDeps = extensionsState.tree.reverseDependenciesFor(ext);

  return (
    <ExtensionElement
      ext={ext}
      active={false}
      movability={{ up: false, down: false }}
      buttonText={t('gui-general:activate')}
      clickCallback={clickCallback}
      moveCallback={() => {}}
      revDeps={revDeps.filter(
        (e) => extensionsState.activeExtensions.flat().indexOf(e) !== -1
      )}
    />
  );
}

export function ActiveExtensionElement(props: {
  ext: Extension;
  index: number;
  arr: Extension[];
}) {
  const { ext, index, arr } = props;

  const configurationTouched = useConfigurationTouched();
  const [extensionsState, setExtensionsState] = useExtensionStateReducer();

  const revDeps = extensionsState.tree.reverseDependenciesFor(ext);
  const depsFor = extensionsState.tree.directDependenciesFor(ext);

  const movability = {
    up: index > 0 && revDeps.indexOf(arr[index - 1]) === -1,
    down: index < arr.length - 1 && depsFor.indexOf(arr[index + 1]) === -1,
  };

  const [t] = useTranslation(['gui-editor']);

  return (
    <ExtensionElement
      ext={ext}
      active
      movability={movability}
      buttonText={t('gui-general:deactivate')}
      clickCallback={async () => {
        const confirmed = await warnClearingOfConfiguration(
          configurationTouched
        );
        if (!confirmed) {
          return;
        }
        const newExtensionState =
          removeExtensionFromExplicitlyActivatedExtensions(
            extensionsState,
            ext
          );

        setExtensionsState(newExtensionState);
      }}
      moveCallback={async (event: { name: string; type: 'up' | 'down' }) => {
        const confirmed = await warnClearingOfConfiguration(
          configurationTouched
        );
        if (!confirmed) {
          return;
        }

        const newExtensionsState = moveExtension(extensionsState, event);

        setExtensionsState(newExtensionsState);
      }}
      revDeps={revDeps.filter(
        (e: Extension) => extensionsState.activeExtensions.indexOf(e) !== -1
      )}
    />
  );
}
