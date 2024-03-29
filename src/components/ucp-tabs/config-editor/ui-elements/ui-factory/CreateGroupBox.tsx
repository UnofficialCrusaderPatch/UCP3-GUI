import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import { Accordion, AccordionBody, AccordionHeader } from 'react-bootstrap';
import { GroupBoxDisplayConfigElement } from '../../../../../config/ucp/common';
// eslint-disable-next-line import/no-cycle
import CreateUIElement from './CreateUIElement';

function CreateGroupBox(args: {
  spec: GroupBoxDisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const { spec, disabled, className } = args;
  const { name, description, children, header, text, accordion } = spec;

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
      <Row key={`${name}-${row}`} className="">
        {rowChildren}
      </Row>,
    );
  }

  if ((accordion || {}).enabled) {
    return (
      // <Form key={`${name}-groupbox`}>
      <Accordion
        bsPrefix="ucp-accordion ui-element"
        className={`${(spec.style || {}).className} ${className}`}
        style={{
          backgroundColor: 'rgba(245, 245, 227, 0.42)',
          ...(spec.style || {}).css,
        }}
      >
        <AccordionHeader className="">
          <h5>{header}</h5>
        </AccordionHeader>
        <AccordionBody className="">
          <div>
            <span>{finalDescription}</span>
          </div>
          <div>{cs}</div>
        </AccordionBody>
        {/* <Row>
          <span className="text-muted text-end">module-name-v1.0.0</span>
        </Row> */}
      </Accordion>
      // </Form>
    );
  }

  return (
    // <Form key={`${name}-groupbox`}>
    <div
      className={`ui-element pb-3 ${(spec.style || {}).className} ${className}`}
      style={(spec.style || {}).css}
    >
      <Row>
        <h5>{header}</h5>
        <div>
          <span>{finalDescription}</span>
        </div>
      </Row>
      <Row>{cs}</Row>
      {/* <Row>
          <span className="text-muted text-end">module-name-v1.0.0</span>
        </Row> */}
    </div>
    // </Form>
  );
}

export default CreateGroupBox;
