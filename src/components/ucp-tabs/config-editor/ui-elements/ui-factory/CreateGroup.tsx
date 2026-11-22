// eslint-disable-next-line import/no-cycle
import CreateConfigTable from './CreateConfigTable';
// eslint-disable-next-line import/no-cycle
import ConfigChildren from './ConfigChildren';
import { GroupDisplayConfigElement } from '../../../../../config/ucp/common';
import { displayChildren } from '../../../../../config/ucp/display-tree';

export default function CreateGroup({
  spec,
  disabled,
  className,
}: {
  spec: GroupDisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  if (spec.table)
    return (
      <CreateConfigTable
        spec={spec}
        disabled={disabled}
        className={className}
      />
    );
  return (
    <div
      className={`ui-element ${spec.style?.className ?? ''} ${className}`}
      style={spec.style?.css}
    >
      <ConfigChildren
        elements={displayChildren(spec)}
        columns={spec.columns}
        disabled={disabled}
      />
    </div>
  );
}
