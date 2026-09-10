import Row from 'react-bootstrap/Row';
import { useContext } from 'react';
import { Accordion, AccordionBody, AccordionHeader } from 'react-bootstrap';
import { displayChildren } from '../../../../../config/ucp/display-tree';
import { ModalFilterContext } from './sections/modal-filter';
import { settingRoots } from '../../../../../function/configuration/qualifiers';
import QualifierControl from './QualifierControl';
import { GroupBoxDisplayConfigElement } from '../../../../../config/ucp/common';
// eslint-disable-next-line import/no-cycle
import ConfigChildren from './ConfigChildren';

function CreateGroupBox(args: {
  spec: GroupBoxDisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const { spec, disabled, className } = args;
  const { description, header, text, accordion } = spec;

  const matches = useContext(ModalFilterContext);
  const finalDescription = description ?? text;
  const cs = (
    <ConfigChildren
      elements={displayChildren(spec)}
      columns={spec.columns}
      disabled={disabled}
    />
  );

  if ((accordion || {}).enabled) {
    return (
      // <Form key={`${name}-groupbox`}>
      <Accordion
        activeKey={matches ? '0' : undefined}
        bsPrefix="ucp-accordion ui-element"
        className={`${(spec.style || {}).className} ${className}`}
        style={{
          backgroundColor: 'rgba(245, 245, 227, 0.42)',
          ...(spec.style || {}).css,
        }}
      >
        <Accordion.Item eventKey="0">
          <div className="qualifier-heading">
            <QualifierControl roots={settingRoots(spec)} disabled={disabled} />
            <AccordionHeader className="">
              <h5>{header}</h5>
            </AccordionHeader>
          </div>
          <AccordionBody className="">
            <div>
              <span>{finalDescription}</span>
            </div>
            <div>{cs}</div>
          </AccordionBody>
        </Accordion.Item>
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
        <h5 className="qualifier-heading">
          <QualifierControl roots={settingRoots(spec)} disabled={disabled} />
          {header}
        </h5>
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
