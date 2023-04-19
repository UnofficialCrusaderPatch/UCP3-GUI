import { DisplayConfigElement } from 'config/ucp/common';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Container from 'react-bootstrap/Container';
// eslint-disable-next-line import/no-cycle
import CreateUIElement from './CreateUIElement';

function CreateGroup(args: {
  spec: DisplayConfigElement;
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
        <Col key={`${name}-${row}-${children[i].url || children[i].name}`}>
          <CreateUIElement
            key={children[i].url}
            spec={children[i]}
            disabled={disabled}
            className=""
          />
        </Col>
      );
    }
    // Or use key: children[i].url but that fails if no children?
    cs.push(
      <Row key={`${name}-${row}`} className="my-1">
        {rowChildren}
      </Row>
    );
  }

  return (
    <Container className={`my-2 px-0 pb-4 ${className}`} style={{ margin: 0 }}>
      {cs}
    </Container>
  );
}

export default CreateGroup;
