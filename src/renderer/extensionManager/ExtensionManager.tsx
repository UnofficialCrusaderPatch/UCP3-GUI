import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';

import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import ToggleButton from 'react-bootstrap/ToggleButton';
import { Button, Col, Container, Form, ListGroup, Row } from 'react-bootstrap';
import { useReducer } from 'react';
import { Extension } from '../../common/config/common';
import ExtensionDependencySolver from '../../common/config/ExtensionDependencySolver';

function renderExtension(
  ext: Extension,
  buttonText: string,
  clickCallback: (event: unknown) => void
) {
  const { name, version, author } = ext.definition;

  // my-auto is also possible instead of align-items-center
  return (
    <ListGroup.Item
      key={`${name}-${version}-${author}`}
      style={{ backgroundColor: 'var(--bs-gray-800)' }}
      className="text-light border-light container border-bottom p-1"
    >
      <Row className="align-items-center">
        <Col>
          <span className="mx-2">{name}</span>
          <span className="mx-2 text-secondary">-</span>
          <span className="mx-2" style={{ fontSize: 'smaller' }}>
            {version}
          </span>
          <span className="mx-2">{author}</span>
          {/*             <Form.Switch id={`extension-toggle-${name}-${version}-${author}`}>
              <Form.Switch.Input />
              <Form.Switch.Label>
                <span className="mx-2">{name}</span>
                <span className="mx-2 text-secondary">-</span>
                <span className="mx-2" style={{ fontSize: 'smaller' }}>
                  {version}
                </span>
                <span className="mx-2">{author}</span>
              </Form.Switch.Label>
            </Form.Switch> */}
        </Col>
        <Col className="col-auto">
          <Button className="fs-8" onClick={clickCallback}>
            {buttonText}
          </Button>
        </Col>
      </Row>
    </ListGroup.Item>
  );
}

export default function ExtensionManager(args: { extensions: Extension[] }) {
  const { extensions } = args;

  const [getActiveExtensions, setActiveExtensions] = useReducer(
    (state: Extension[], newState: Extension[]): Extension[] => {
      return [...newState];
    },
    []
  );

  const [getInstalledExtensions, setInstalledExtensions] = useReducer(
    (state: Extension[], newState: Extension[]): Extension[] => {
      return [...newState];
    },
    [...extensions],
    () => [...extensions]
  );

  const eUI = getInstalledExtensions.map((ext) => {
    return renderExtension(ext, 'Activate', (event) => {
      const impliedExtensions = new ExtensionDependencySolver(
        extensions
      ).dependenciesFor(ext.name);

      const linear: string[] = [];
      impliedExtensions.forEach((iea) => iea.forEach((ie) => linear.push(ie)));

      const ies: Extension[] = linear
        .map((v: string) => {
          const i = extensions.map((e) => e.name).indexOf(v);
          if (i !== -1) {
            return extensions[i];
          }
          throw new Error();
        })
        .filter((e: Extension) => linear.indexOf(e.name) !== -1)
        .reverse();

      const remainder = getActiveExtensions.filter(
        (e: Extension) => ies.indexOf(e) === -1
      );

      const final = [...ies, ...remainder];

      setActiveExtensions(final);
      setInstalledExtensions(
        getInstalledExtensions.filter((e: Extension) => final.indexOf(e) === -1)
      );
    });
  });

  return (
    <Container>
      <Row className="mb-3">
        <h4>Activated extensions</h4>
        {getActiveExtensions.map((ext) => {
          return renderExtension(ext, 'Deactivate', (event) => {
            const n = getActiveExtensions.filter((e) => e !== ext);
            setActiveExtensions(n);
            setInstalledExtensions(
              [...getInstalledExtensions, ext].sort(
                (a: Extension, b: Extension) => a.name.localeCompare(b.name)
              )
            );
          });
        })}
      </Row>
      <Row>
        <h4>Installed extensions</h4>
        {eUI}
      </Row>
    </Container>
  );
}
