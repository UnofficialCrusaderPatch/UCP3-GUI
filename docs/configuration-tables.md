# Configuration tables

Frontend 1.0.16 also supports `children` on `UCP2Switch`. The children and
description share one collapsible body. The switch opens it when enabled and
closes it when disabled; its separate arrow can toggle visibility without
changing configuration. Disabled/locked parent switches disable child controls.

Choice/RadioGroup table cells can describe automatic values with
`valuePresentation: {native: {choice: defend}}`. This marks a choice without
writing an override; clicking the marked choice makes it explicit. For an
automatic value with no single choice, use `{native: {text: 'Varies by AI'}}`.
Presentation is applied after `inheritFrom` resolution, and only in tables.
Choice aliases must name a choice present in both the cell and column.

An optional `table` property on `display: Group` arranges existing controls in
rows with shared column headings. Configuration storage, defaults, requirements,
locks, suggestions and import/export still use each control's existing `url` and
`contents`. No new value format or module runtime code is needed.

Requires frontend 1.0.16. Modules using this layout should declare
`dependencies.frontend: '>=1.0.16 <2.0.0'` in `definition.yml`.

Each child is a row (`Group` or `GroupBox`). Its `header`, then `text`, then `name`
supplies the row label. Its children are the cells, in column order. Keep meaningful
labels on those controls: older frontends ignore `table` and render the ordinary
groups. New frontends hide repeated labels for numeric and radio cells, while
giving their inputs accessible names containing both the row and column labels.

```yaml
- name: troops
  display: Group
  text: Troops
  table:
    rowHeader: Troop
    columns:
    - name: role
      header: Starting role
      choices:
      - {name: native, text: Original}
      - {name: dig, text: Dig}
    - {name: count, header: Count}
  children:
  - name: archer
    display: GroupBox
    header: Archer
    columns: 2
    children:
    - name: archer-role
      display: Choice
      text: Starting role
      url: my-module.archer.role
      contents:
        value: native
        choices:
        - {name: native, text: Original}
        - {name: dig, text: Dig}
    - name: archer-count
      display: Number
      text: Count
      url: my-module.archer.count
      contents: {type: number, value: 5, min: 0, max: 1000}
```

A column without `choices` renders its existing control normally, including
Number, Switch, Choice and other controls. A column with `choices` displays its
Choice or RadioGroup cell as mutually exclusive sword checkboxes, with one shared
heading per choice. Each cell retains its own allowed choices: a missing choice
shows a dash, so unavailable options do not shift later columns. Column choices
must include every choice that the cell supports; a layout that would hide fields
or options falls back to ordinary groups.

Use unique row and column names. All rows must have one child per column.
Hidden rows remain hidden; a hidden cell keeps its space. The table only changes
presentation and does not add an enable switch to its groups.

`table.rowWidth` and each column's `width` accept CSS lengths such as `10rem` or
`64px`. A choice column's width applies to each radio position. Defaults are
10rem for row labels, 4.25rem per radio choice, and 7rem for other controls.

To omit a redundant inheritance radio, add
`inheritFrom: {url: my-module.common.role, value: inherit}` to the child Choice.
When its stored value is `inherit`, the selected radio follows the referenced
configuration field (or that field's default). Clicking any radio, including
the already-selected inherited choice, sets an explicit override. The normal
reset action restores the child's `contents.value`; set that to `inherit` to
resume following the common value. The referenced field must be a scalar choice
whose concrete values are valid for the child; inheritance resolves one level.

A column's `unselectedValues: [native]` allows a valid automatic state to have
no selected radio. Its value stays in the child control's choices for schema and
saved-configuration compatibility. Explain this once above the table. This is
useful when the game's native behaviour varies by AI and no single fixed radio
selection would accurately describe it.

`rowHeader`, `header` and choice `text` accept the usual `{{locale_key}}` syntax.
Tables scroll horizontally at narrow widths. Native radios remain keyboard
focusable and use arrow-key selection within each configuration URL. Their
associated labels use the standard sword checkbox artwork.

The troop-behaviour module uses Defend/Dig and Hold/Patrol columns. The starting
resources module demonstrates numeric tables for game modes and Human/AI gold.
