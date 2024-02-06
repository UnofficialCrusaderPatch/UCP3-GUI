import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
// eslint-disable-next-line import/no-cycle
import CreateUIElement from './CreateUIElement';
import {
  GroupDisplayConfigElement,
  UrlableDisplayConfigElement,
} from '../../../../../config/ucp/common';

function CreateGroup(args: {
  spec: GroupDisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const { spec, disabled, className } = args;
  // TODO: header property is not used, is this expected?
  const { name, description, children, text } = spec;

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
        <Col
          key={`${name}-${row}-${(children[i] as UrlableDisplayConfigElement).url || children[i].name}`}
        >
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

  return (
    <div
      className={`ui-element ${(spec.style || {}).className} ${className}`}
      style={(spec.style || {}).css}
    >
      {cs}
    </div>
  );
}

export default CreateGroup;
