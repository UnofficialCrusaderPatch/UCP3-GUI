import {
  Accordion,
  AccordionBody,
  AccordionHeader,
  AccordionItem,
} from 'react-bootstrap';
import { ParagraphDisplayConfigElement } from '../../../../../config/ucp/common';

function CreateParagraph(args: {
  spec: ParagraphDisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const { spec } = args;
  const { header, text, style } = spec;

  // eslint-disable-next-line react/jsx-no-useless-fragment
  let headerElement = <></>;
  if (header !== undefined) {
    headerElement = <h5>{header}</h5>;
  }

  // eslint-disable-next-line react/jsx-no-useless-fragment
  let textElement = <></>;
  if (text !== undefined) {
    textElement = <p className="ui-element">{text || ''}</p>;
  }

  if (header === undefined && text === undefined) {
    // eslint-disable-next-line react/jsx-no-useless-fragment
    return <></>;
  }

  if (header !== undefined && text === undefined) {
    return headerElement;
  }

  if (header === undefined && text !== undefined) {
    return textElement;
  }

  return (
    <Accordion
      bsPrefix="ucp-accordion ui-element"
      className="sword-checkbox "
      style={{ marginLeft: 0, marginBottom: 0, ...style }}
      defaultActiveKey={['0']}
    >
      <AccordionItem eventKey="0">
        <AccordionHeader>{headerElement}</AccordionHeader>
        <AccordionBody>{textElement}</AccordionBody>
      </AccordionItem>
    </Accordion>
  );
}

export default CreateParagraph;
