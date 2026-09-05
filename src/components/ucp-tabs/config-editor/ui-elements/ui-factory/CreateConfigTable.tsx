import { useId, useMemo } from 'react';
import {
  GroupDisplayConfigElement,
  DisplayConfigElement,
  ConfigTableColumn,
} from '../../../../../config/ucp/common';
// eslint-disable-next-line import/no-cycle
import CreateUIElement from './CreateUIElement';
import ConfigTableCellContext from './ConfigTableCellContext';
import './config-table.css';

function ConfigTableCell({
  cell,
  column,
  rowLabel,
  disabled,
}: {
  cell: DisplayConfigElement;
  column: ConfigTableColumn;
  rowLabel: string;
  disabled: boolean;
}) {
  const context = useMemo(
    () => ({ label: `${rowLabel}: ${column.header}`, choices: column.choices }),
    [rowLabel, column],
  );
  const control: DisplayConfigElement =
    column.choices && cell.display === 'Choice'
      ? { ...cell, display: 'RadioGroup' }
      : cell;
  return (
    <td colSpan={column.choices?.length || 1}>
      {!cell.hidden && (
        <ConfigTableCellContext.Provider value={context}>
          <CreateUIElement
            spec={control}
            disabled={disabled}
            className="config-table-control"
          />
        </ConfigTableCellContext.Provider>
      )}
    </td>
  );
}

/** A layout for existing controls, with no configuration storage of its own. */
function CreateConfigTable({
  spec,
  disabled,
  className,
}: {
  spec: GroupDisplayConfigElement;
  disabled: boolean;
  className: string;
}) {
  const id = useId();
  const layout = spec.table!;
  const hasChoices = layout.columns.some((column) => column.choices?.length);
  const rows = spec.children.filter((row) => !row.hidden);
  // A malformed layout must not silently drop editable configuration fields.
  const valid =
    layout.columns.length > 0 &&
    rows.every(
      (row) =>
        'children' in row &&
        row.children.length === layout.columns.length &&
        row.children.every((cell, index) => {
          const { choices } = layout.columns[index];
          return (
            !choices ||
            ((cell.display === 'Choice' || cell.display === 'RadioGroup') &&
              cell.contents.choices.every((choice) =>
                choices.some(
                  (columnChoice) => columnChoice.name === choice.name,
                ),
              ))
          );
        }),
    );
  if (!valid) {
    return (
      <CreateUIElement
        spec={{ ...spec, table: undefined }}
        disabled={disabled}
        className={className}
      />
    );
  }
  return (
    <div
      className={`config-table-scroll ui-element ${spec.style?.className || ''} ${className}`}
      style={spec.style?.css}
      role="region"
      aria-label={spec.text || layout.rowHeader}
      // Scrollable regions must be reachable by keyboard.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
    >
      <table
        className="config-table"
        style={{
          minWidth: `${11 + layout.columns.reduce((width, column) => width + (column.choices?.length ? column.choices.length * 5 : 7), 0)}rem`,
        }}
      >
        {spec.text && <caption>{spec.text}</caption>}
        <colgroup>
          <col className="config-table-row-name" />
          {layout.columns.flatMap((column) =>
            (column.choices?.length
              ? column.choices
              : [{ name: column.name }]
            ).map((choice) => (
              <col
                key={`${column.name}-${choice.name}`}
                className={
                  column.choices?.length
                    ? 'config-table-choice-column'
                    : 'config-table-value-column'
                }
              />
            )),
          )}
        </colgroup>
        <thead>
          <tr>
            <th scope="col" rowSpan={hasChoices ? 2 : 1}>
              {layout.rowHeader}
            </th>
            {layout.columns.map((column) => (
              <th
                key={column.name}
                id={`${id}-${column.name}`}
                scope={column.choices?.length ? 'colgroup' : 'col'}
                colSpan={column.choices?.length || 1}
                rowSpan={hasChoices && !column.choices?.length ? 2 : 1}
              >
                {column.header}
              </th>
            ))}
          </tr>
          {hasChoices && (
            <tr>
              {layout.columns.flatMap((column) =>
                (column.choices || []).map((choice) => (
                  <th key={`${column.name}-${choice.name}`} scope="col">
                    {choice.text}
                  </th>
                )),
              )}
            </tr>
          )}
        </thead>
        <tbody>
          {rows.map((row) => {
            const cells = (row as GroupDisplayConfigElement).children;
            const rowLabel =
              ('header' in row ? row.header : undefined) ||
              ('text' in row ? row.text : undefined) ||
              row.name;
            return (
              <tr key={row.name}>
                <th scope="row">{rowLabel}</th>
                {layout.columns.map((column, index) => (
                  <ConfigTableCell
                    key={column.name}
                    cell={cells[index]}
                    column={column}
                    rowLabel={rowLabel}
                    disabled={disabled}
                  />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default CreateConfigTable;
