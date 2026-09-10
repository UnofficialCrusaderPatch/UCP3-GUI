# Configuration submenus in options.yml

Use `display: Modal` to put ordinary Customizations controls in a launcher
dialog. This contributes to [#159](https://github.com/UnofficialCrusaderPatch/UCP3-GUI/pull/159)
and [#154](https://github.com/UnofficialCrusaderPatch/UCP3-GUI/issues/154), carrying
forward gynt's original modal schema and opener.

The GUI reads **options.yml**. “ui.yml” is a conceptual description of the UI
definition, not another supported filename. No HTML, CSS, JavaScript, source
assets, new webview, or configuration-transfer API is needed.

## Authoring contract

```yaml
meta:
  version: 1.0.0
options:
  - name: resources
    display: Modal
    header: '{{resources.title}}'
    description: '{{resources.description}}'
    category: [Custom settings]
    columns: 2
    children:
      - name: normal-wood
        display: Number
        text: '{{wood}}'
        url: startResources.startGoods.normal.wood
        contents:
          type: number
          value: 100
          min: 0
          max: 1000000
      - name: normal-stone
        display: Number
        text: '{{stone}}'
        url: startResources.startGoods.normal.stone
        contents:
          type: number
          value: 50
          min: 0
          max: 1000000
```

| Field | Meaning |
| --- | --- |
| `name` | Stable container identity; give each sibling a distinct name. |
| `display: Modal` | Render an opener instead of its children in the main list. |
| `header` | Localized opener text and accessible dialog title; falls back to name. |
| `text`, `description` | Localized explanatory text; description takes precedence inside. |
| `children` | Ordinary configuration elements, including Group, GroupBox, Modal, and CustomMenu. Omitted or empty children show an intentional empty state; malformed children are rejected during discovery. |
| `columns` | Optional equal-width grid, default 1; bounded to 1–12. Narrow modal content stacks the columns. |
| `enabled` | Optional existing enabled expression, e.g. `my-extension.editing` or `'false'`. Remains reactive while open and combines with inherited disabling. |
| `hidden`, `category`, `style` | Existing UI conventions; hidden descendants stay hidden and retain their configuration. |

Use GroupBox for settings that should remain in the main list, Modal for a
substantial subtree, and CustomMenu for domain-specific interfaces such as AI
Swapper. CustomMenu retains its own source/Save contract.

To convert a GroupBox, change only `display: GroupBox` to `display: Modal`.
Keep child URLs, contents, defaults and localization keys. A modal has no URL
or configuration value of its own. The executable
[before example](examples/declarative-modal/starting-resources-before.yml) and
[after example](examples/declarative-modal/modal-resources-1.0.0/options.yml)
have identical children and persisted meaning.

## Editing, search and navigation

Controls edit the **same working configuration** as Customizations. Close,
Escape and clicking the backdrop retain edits. They do not save to disk and do
not undo changes. Use the existing main-editor save/apply, export, import, or
plugin-creation actions for persistence. There is deliberately no Cancel button
claiming to undo live edits. Opening, searching and closing do not touch values.

Required locks, suggested defaults, validation, warnings, tooltips, reset and
Creator qualifier controls come from the ordinary control factory. Modal and
group qualifier actions apply to their whole subtree, including filtered-out
settings, and honor required locks. Individual resets retain the existing
control's scope. Status explanations are also shown inside the modal footer.

Global search keeps a modal opener when a visible descendant matches. Opening
starts with that search. Each dialog has an independent local filter and Show
all action. Matching group headings reveal their subtree; matching table cells
retain their complete row so values remain associated with column headings.
GroupBox accordions expand while filtering. Nested dialogs inherit the parent's
query initially, then filter independently. Clear it to explore the full menu.

Focus starts in search; Tab/Shift+Tab stay inside, Escape closes the current
dialog, and focus returns to its opener. A child that consumes Escape (such as
a reset popover) gets it first. Title/search and Close stay outside the scrolling
body. Nested declarative and CustomMenu dialogs preserve the parent and its
filter/scroll state. Removing an owner or changing installations clears its
dialog; asynchronous file/source results from unmounted controls are ignored.

## Runnable examples

The [example directory](examples/declarative-modal) contains complete plugin
folders with `definition.yml`, `options.yml`, `config.yml`, and locales:

* `modal-resources-1.0.0`: real `startResources` URLs/defaults, 19 resource rows
  and Normal/Crusader/Deathmatch columns, using the existing `Group.table`
  layout. Requires `startResources >= 1.0.1`. Definitions were copied from
  `ucp_startResources/options.yml`; this is not a new resource implementation.
* `modal-mixed-1.0.0`: explicitly synthetic values, mixed ordinary controls,
  conditional groups, nested file/slider menu, empty/disabled menus, and all
  four legacy UCP2 display variants with their existing value shapes.
* `modal-presets-1.0.0`: depends on modal-mixed, requires its locked amount to
  be 25 and suggests amount 30 for its suggested field. Activate above the
  mixed plugin to exercise the actual configuration resolver.

Copy the desired folders to an **isolated test installation's** `ucp/plugins/`,
reload the launcher, activate them in Content, and open Customizations. No game
launch is necessary for this editor fixture. For file selection choose a file
inside the test installation, such as `ucp-config.yml`.

The resource plugin is an additional demonstration view of another module's
settings. For production authoring, move the owning extension's original
subtree into its Modal rather than retaining two views with duplicate URLs.
Do not replace the production AI Swapper assets with these examples.

Automated checks load these files through `readUISpec`, `readLocales`, metadata
attachment and localization, then use the real factory/search/state/serializer:

```sh
npm test -- src/components/ucp-tabs/config-editor/tests/declarative-modal.test.tsx
```

## Implementation boundaries

`display-tree.ts` shares descendant traversal across discovery and filtering.
Search retains MiniSearch and its existing prefix/fuzzy rules. ConfigChildren
shares columns across Group, GroupBox and Modal; Group.table is unchanged in
meaning and filters by row. Ordinary renderers own values and persistence.

The overlay infrastructure retains a small stack only while a declarative
parent is present. Other callers keep replacement semantics. OverlayPortal
keeps dialog contents in the opener's React context, so disabled props, language
and state remain live. Scoped cleanup removes descendants without clearing an
unrelated later overlay. No dialog state is serialized and no extra resolver,
configuration store, runtime dependency or window manager is introduced.

PR #363 remains separate: this contribution does not import its binary-asset,
sandbox save, or texture-cache work. Existing current-main table, qualifier and
scaling behavior is the integration baseline.

The current interaction reference is AI Swapper **1.4.0**, source
[`b840ef0`](https://github.com/UnofficialCrusaderPatch/extension-aiSwapper/commit/b840ef0081b897193e82b19ad27ac15fcd8b176b):
its compact layout, local search and Creator qualifiers work with GUI 1.0.16.
The module's old published 1.1.0 archive predates that redesign. GUI and module
versions are independent. Declarative dialogs reuse the GUI's parchment,
ornament, buttons and scrolling, with a compact search row and a scrolling
description so long author text cannot push Close out of reach.

Use Content activation to generate test configurations. Saved `load-order` is
bottom-up (dependencies first); the Content list displays the reverse order.
