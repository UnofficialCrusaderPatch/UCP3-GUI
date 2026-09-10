/* eslint-disable react/require-default-props */
import { CSSProperties, useContext } from 'react';
import { DisplayConfigElement } from '../../../../../config/ucp/common';
import { ModalFilterContext } from './sections/modal-filter';
import { shouldBeIncluded } from '../../../../../config/ucp/display-tree';
// eslint-disable-next-line import/no-cycle
import CreateUIElement from './CreateUIElement';

export default function ConfigChildren({
  elements,
  columns = 1,
  disabled,
}: {
  elements: DisplayConfigElement[];
  columns?: number;
  disabled: boolean;
}) {
  const matches = useContext(ModalFilterContext);
  const count = Number.isFinite(columns)
    ? Math.max(1, Math.min(12, Math.floor(columns)))
    : 1;
  return (
    <div
      className="config-columns"
      style={{ '--config-columns': count } as CSSProperties}
    >
      {elements
        .filter(
          (child) =>
            !child.hidden && (!matches || shouldBeIncluded(matches, child)),
        )
        .map((child, index) => (
          <CreateUIElement
            key={`${child.name}-${'url' in child ? child.url : index}`}
            spec={child}
            disabled={disabled}
            className=""
          />
        ))}
    </div>
  );
}
