# Configuration tables

An optional `table` property on `display: Group` arranges existing controls in
rows with shared column headings. Configuration storage, defaults, requirements,
locks, suggestions and import/export still use each control's existing `url` and
`contents`. No new value format or module runtime code is needed.

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

`rowHeader`, `header` and choice `text` accept the usual `{{locale_key}}` syntax.
Tables scroll horizontally at narrow widths. Native radios remain keyboard
focusable and use arrow-key selection within each configuration URL. Their
associated labels use the standard sword checkbox artwork.

The troop-behaviour module uses two groups of four radio columns. The starting
resources module demonstrates numeric tables for game modes and Human/AI gold.
