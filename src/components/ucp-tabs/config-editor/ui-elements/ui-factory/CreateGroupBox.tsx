import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
import { GroupBoxDisplayConfigElement } from '../../../../../config/ucp/common';
// eslint-disable-next-line import/no-cycle
import CreateUIElement from './CreateUIElement';

function CreateGroupBox(args: {
  spec: GroupBoxDisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const { spec, disabled, className } = args;
  const { name, description, children, header, text } = spec;

  let { columns } = spec;
  if (columns === undefined) columns = 1;

  let finalDescription = description;
  if (finalDescription === undefined) finalDescription = text;
  const itemCount = children.length;
  const rows = Math.ceil(itemCount / columns);

  const cs = [];

  for (let row = 0; row < rows; row += 1) {
    const rowChildren = [];
    for (
      let i = columns * row;
      i < Math.min(columns * (row + 1), children.length);
      i += 1
    ) {
      rowChildren.push(
        // TODO: find a fix for this key madness: enforce 'name' ?
        <Col key={JSON.stringify(children[i])}>
          <CreateUIElement
            spec={children[i]}
            disabled={disabled}
            className=""
          />
        </Col>,
      );
    }
    // Or use key: children[i].url but that fails if no children?
    cs.push(
      <Row key={`${name}-${row}`} className="my-1">
        {rowChildren}
      </Row>,
    );
  }

  return (
    // <Form key={`${name}-groupbox`}>
    <Container
      className={`border-light my-2 px-0  ui-element ${className}`}
      style={{ margin: 0 }}
    >
      <Row className="my-3">
        <h5>{header}</h5>
        <div>
          <span>{finalDescription}</span>
        </div>
      </Row>
      <Row className="mt-1">{cs}</Row>
      {/* <Row>
        <span className="text-muted text-end">module-name-v1.0.0</span>
      </Row> */}
    </Container>
    // </Form>
  );
}

export default CreateGroupBox;
