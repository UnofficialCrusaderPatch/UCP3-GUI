import Navbar from 'react-bootstrap/Navbar';
import Nav from 'react-bootstrap/Nav';

import Tabs from 'react-bootstrap/Tabs';
import Tab from 'react-bootstrap/Tab';
import ToggleButton from 'react-bootstrap/ToggleButton';
import { Button, Col, Container, Form, ListGroup, Row } from 'react-bootstrap';

export default function ExtensionManager(args: {
  extensions: [
    { definition: { name: string; version: string; author: string } }
  ];
}) {
  const { extensions } = args;

  const eUI = extensions.map((ext) => {
    const { name, version, author } = ext.definition;

    // my-auto is also possible instead of align-items-center
    return (
      <ListGroup.Item
        key={`${name}-${version}-${author}`}
        style={{ backgroundColor: 'var(--bs-gray-800)' }}
        className="text-light border-light container"
      >
        <Row className="align-items-center">
          <Col>
            <Form.Switch id={`extension-toggle-${name}-${version}-${author}`}>
              <Form.Switch.Input />
              <Form.Switch.Label>
                <span className="mx-2">{name}</span>
                <span className="mx-2 text-secondary">-</span>
                <span className="mx-2" style={{ fontSize: 'smaller' }}>
                  {version}
                </span>
                <span className="mx-2">{author}</span>
              </Form.Switch.Label>
            </Form.Switch>
          </Col>
          <Col className="col-auto">
            <Button>Info</Button>
          </Col>
        </Row>
      </ListGroup.Item>
    );
  });

  return (
    <Container>
      <Row>
        <h3>Installed extensions</h3>
        {eUI}
      </Row>
    </Container>
  );
}
