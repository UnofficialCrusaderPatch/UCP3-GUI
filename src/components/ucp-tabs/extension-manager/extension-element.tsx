import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import {
  Button,
  Col,
  Container,
  ListGroup,
  Row,
  Tooltip,
} from 'react-bootstrap';
import { useTranslation } from 'react-i18next';
import { Extension } from 'config/ucp/common';
import ExtensionDependencySolver from 'config/ucp/extension-dependency-solver';
import {
  useExtensions,
  useExtensionStateReducer,
  useSetActiveExtensions,
} from 'hooks/jotai/globals-wrapper';
import { ExtensionsState } from 'function/global/types';

import './extension-manager.css';
import { info } from 'util/scripts/logging';

export default function ExtensionElement(props: {
  ext: Extension;
  active: boolean;
  movability: { up: boolean; down: boolean };
  buttonText: string;
  clickCallback: (event: unknown) => void;
  moveCallback: (event: { name: string; type: 'up' | 'down' }) => void;
  revDeps: string[];
}) {
  const {
    ext,
    active,
    movability,
    buttonText,
    clickCallback,
    moveCallback,
    revDeps,
  } = props;
  const {
    name,
    version,
    author,
    'display-name': displayName,
    description,
  } = ext.definition;

  const [t] = useTranslation(['gui-editor']);

  const renderTooltip = (p: unknown) => {
    if (revDeps.length > 0) {
      return (
        // eslint-disable-next-line react/jsx-props-no-spreading
        <Tooltip {...(p as object)}>
          {revDeps.length > 0
            ? t('gui-editor:extensions.is.dependency', {
                dependencies: revDeps.join(', '),
              })
            : ''}
        </Tooltip>
      );
    }
    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <></>;
  };

  const arrows = active ? (
    <>
      <Col
        className="col-auto arrow-container"
        disabled={!movability.up}
        onClick={() => {
          if (movability.up) moveCallback({ name: ext.name, type: 'up' });
        }}
      >
        <div className="arrow up" />
      </Col>
      <Col
        className="col-auto arrow-container"
        disabled={!movability.down}
        onClick={() => {
          if (movability.down) moveCallback({ name: ext.name, type: 'down' });
        }}
      >
        <div className="arrow down" />
      </Col>
    </>
  ) : (
    // eslint-disable-next-line react/jsx-no-useless-fragment
    <></>
  );

  // my-auto is also possible instead of align-items-center
  return (
    <ListGroup.Item
      key={`${name}-${version}-${author}`}
      style={{ backgroundColor: 'var(--bs-gray-800)' }}
      className="text-light border-secondary container border-bottom p-1"
    >
      <Row className="align-items-center">
        {arrows}
        <Col>
          <Row>
            <Col className="col-2">
              <span className="mx-2">{displayName || name}</span>
            </Col>
            <Col className="col-3">
              <span className="mx-2 text-secondary">-</span>
              <span className="mx-2" style={{ fontSize: 'smaller' }}>
                {name}-{version}
              </span>
            </Col>
            <Col>
              <span className="mx-2">{description || ''}</span>
            </Col>
          </Row>
        </Col>
        <Col className="col-auto">
          <OverlayTrigger placement="left" overlay={renderTooltip}>
            <div>
              <Button
                className="fs-8"
                onClick={clickCallback}
                disabled={revDeps.length > 0}
              >
                {buttonText}
              </Button>
            </div>
          </OverlayTrigger>
        </Col>
      </Row>
    </ListGroup.Item>
  );
}
