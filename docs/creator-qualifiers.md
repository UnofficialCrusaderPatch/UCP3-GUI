# Creator qualifiers

Creator mode shows a persistent compact control beside settings and category/group headings: open padlock = Suggested, closed padlock = Required, dash = Mixed. Click Required to suggest; click Suggested or Mixed to require. Keyboard Tab and Enter/Space work without hover. Accessible labels and tooltips are localized.

A single-setting action explicitly copies the current editable value into Customisations. Group actions use only already configured local values, excluding upstream locks and submenu bookkeeping. Groups do not create inherited category rules or copy defaults. They apply existing per-setting qualifiers. Saving and exporting use the normal configuration serializer.

Custom menus receive optional `qualifierEditing`, `creatorMode` and relative `qualifiers` fields from `getCurrentConfig()`. They may expose `getConfigQualifiers()` returning relative keys mapped to `required` or `suggested`. The GUI reads this alongside `getConfig()` only on Save or Save and Close. Close discards staged changes. Legacy menus need no changes. The GUI ignores invalid qualifiers, inherited-only keys and edits to upstream required values. Removing an override removes its qualifier too.

AI Swapper's companion change adds controls to each overview component, the selected-slot heading and the existing help row (All slots). Slot/all-slot actions include configured AI runtime components only, not inherited values or the menu metadata object. No new row is added. Configure an AI component before changing its qualifier. Upstream requirements remain locked.

Manual review: use the isolated preview setup; enable Creator mode, edit two values, set their category Required, change one back to Suggested and check Mixed. Apply/reopen and export to a disposable plugin; check required-value/suggested-value in YAML. In AI Swapper select components for two slots, use component/slot/All slots controls, check Close discards changes and Save persists them. Load the exported plugin and verify only its required components are locked. Check the smallest supported window size, GUI scaling and long translations. Do not merge before visual review.

Touched local options reveal a plain black trash icon centered over their blue left marker when the option or marker is hovered, or reset receives keyboard focus. Clicking the marker/icon resets the option using the existing reset behavior. Untouched options have no reset action in Creator mode; normal mode retains the existing hover reset.
