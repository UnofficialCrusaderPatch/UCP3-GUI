# Search, tags and extension families

Store and Content search technical/display names, tag labels and descriptions in the selected GUI language. Search sits below the left list. Prefixes, name substrings, quoted phrases and bounded typo matching are supported; the whole-word sword checkbox disables substring, prefix and approximate matches. Chinese uses browser word segmentation when available. Separate search words combine with AND. The existing filter button combines tag selection with a separate Hide modules category. Tag matching defaults to OR, with one-click OR/AND sword radios. Its filled state means tags are selected or modules are hidden. Filtering never activates an extension or changes its preferred version.

Description lookup is shared with the viewer and cached per identity/language/source. Older catalogs with remote descriptions load in the background with at most four concurrent reads. Loading/incomplete status is visible and cached fallback text remains usable. Installed descriptions are read again after extension discovery reload. The existing Markdown parser supplies searchable visible text; the existing MiniSearch dependency supplies approximate matching.

## What a family is

A family is a launcher-only choice between alternative **plugins**, such as Bare and Applied. It is owned by the author of its root plugin. The game and the framework never see families: they load the flat load order and the settings the launcher writes. A family adds no dependency syntax, no virtual package and no new load-order rule.

Use a family only for alternative configurations of the same thing. Independently combinable features, shared file providers and packages that merely use the same files are not families; give them ordinary dependencies and tags instead.

## Author a family

Add an optional `family` list to `definition.yml`. Exactly one plugin declares `root: true`; that root owns the family ID. The author chooses the root freely: Bare, Applied or another member.

```yaml
# The root, here a files-only Bare plugin
name: example-bare
version: 1.0.0
author: Example Author
type: plugin
frontend: '>=1.0.17 <2.0.0'
family:
  - name: example-family
    root: true
    # Optional: accept members by another author
    members: [example-guest-preset]
tags: [ai]
```

```yaml
# An alternative configuration by the same author
name: example-applied
version: 1.0.0
author: Example Author
type: plugin
frontend: '>=1.0.17 <2.0.0'
dependencies:
  example-bare: '^1.0.0'
family:
  - name: example-family
tags: [ai, aic]
```

Each member keeps its ordinary `config.yml`, locales, dependencies and name/version. There is no configuration ID or qualified dependency syntax. Family-enabled packages require `frontend: '>=1.0.17 <2.0.0'`.

### Rules the launcher enforces

- **Plugins only.** A `type: module` can be neither a member nor a root. Modules ship neutral defaults and are configured by plugins; their family declarations are ignored, with a warning in the launcher log.
- **The root owns the family.** Another plugin is a member only if the root lists it in `members`, or it has the same `author` as the root. Any other self-declared membership is ignored with a warning, so nobody can make someone else's packages mutually exclusive. Building the Store catalog additionally checks that members come from the root's repository; the launcher itself only sees `members` and `author`. Installed packages are checked against the installed root; the Store view checks installed and Store packages together, so an installed member can group with a root that is only in the Store.
- **One root.** A family whose root isn't available, or for which several different plugins claim `root: true`, is ignored and its members appear as ordinary plugins. Several versions of the same root are fine.
- **Save-safe switching.** Members differ in settings and content. They may bring in different stateless modules (for example UCP3 Basics and Basics + Fixes), but they **must not differ in save-state modules**, the modules whose `definition.yml` declares `save-state: required` or `save-state: optional` (see [save-state.md](save-state.md)). If a switch would still remove such a module, the launcher shows the save-state warning ("saves made with X need X") and nothing changes unless the player confirms; a member that adds one is reported in the launcher log.
- **One choice per family.** At most one member claims the family: a member the player selected, or an active member that applies configuration demands. A files-only member pulled in as a dependency (Bare under Applied) stays loaded without claiming the choice. A bundle that depends on a particular member pins that member, so a switch it forbids is refused with the dependency path.

### What a family does not guarantee

A family guarantees one choice among its own members. Plugins outside the family can still suggest or require values for the same settings, and the ordinary priority and conflict rules decide between them. Whole-object suggestions such as `aiSwapper.menu` currently replace each other instead of merging per key (framework issue #104), so two AI presets in different families still compete for that setting.

## Switching and settings

Selecting a member replaces the previous selection in its family. The launcher resolves the whole candidate on a copy of the dependency tree, keeps unaffected providers and their priority where dependencies allow, and validates it before anything changes. Canceling a confirmation or a failed resolution leaves the current setup untouched. The active list never shows family containers; every active extension keeps its real priority position and controls.

Settings follow the same rule for every activation, upgrade and switch: the effective value is the highest-priority required value, otherwise the player's own value, otherwise the highest-priority suggestion, otherwise the module default. If a required value overrides a saved preference, the launcher lists each change as old → new before applying it. Confirming stores the required value as the preference, so the Customisations tab always shows what the game will use and removing the requirement later doesn't bring the old value back. `false`, `0` and empty text are real values. Loading a saved setup applies the same repair and shows one warning listing every changed setting.

## Saved setups

Import, reload, Apply and export use the same family validation. A saved setup that selects two members of one family, for example after a package update declared a new family, opens a "choose one configuration per family" dialog. The conflict is found on the setup as it would load, including presets that a bundle brings in. Nothing is loaded until the player chooses, and OK only works once the choices keep exactly one member per family. The other members are left out of the player's selections, and the dependencies are resolved again from what is kept: providers only a dropped member needed go away, and the saved versions of the kept selections stay. If the choice drops a save-state module, the save-state warning follows. The file on disk changes when the player applies, or launches with Save before launch. Cancel loads nothing; if that happens while the launcher starts or reloads a game folder, Save before launch leaves the file alone until the player applies a setup. A choice that a remaining bundle still contradicts is reported with its dependency path.

## Labels and files

Use the existing flat locale keys `family.example-family: Example` and `family.example-family.configuration: Applied` in each `locale/<language>.yml`. Member labels can be Bare, Applied or any creator-defined name. The Store extracts them into `contents.family-locales` using the same locale fallback as translated tags. Family and configuration labels are searchable.

Put shared assets in one file-providing plugin. Applied members may depend on it and reference its resource path, for example `ucp/plugins/example-bare/resources/ai/...`. The root does not have to own the files, and a dependency does not make the provider another configuration. Members can live in separate directories of the same repository; the Store recipe's `contents.source.location` selects each extension directory for packaging. No nested virtual installation or new filesystem mount is introduced.

## Root availability and interaction

- Content groups families only in the available list and shows `Family: Selected configuration`. The selector remains available when its root is active. Active extensions always appear individually in load order with their own controls; neutral dependency providers keep their ordinary names. If only members are installed and the root is available in the Store, Content leaves those members flat; the Store can still group the available family.
- The chevron expands and collapses. With no choice selected, the collapsed activation arrow activates the declared root. The selected row has no redundant activation arrow; expand it to select another configuration. Name clicks still open details. Store arrows install ordinary packages and don't change active choices.
- Multiple memberships produce references to the same extension state, not duplicate installations. Malformed family metadata doesn't hide an otherwise usable extension.
- Search matches members independently before grouping. A nonmatching installed root remains context for a matching child. Search expansion is separate from the player's normal expansion state.

## Tags and automatic metadata

`tags` is an optional list of stable identifiers. IDs are normalized. Add translated labels to the package's existing `locale/<language>.yml` files using flat `tags.<id>` keys, for example `tags.castles: Burgen` in `locale/de.yml`. Add descriptions to `locale/description-<language>.md`. The supported language codes are `en`, `de`, `fr`, `ru`, `hu`, `tr`, `ch`, `es` and `fa`.

The GUI searches tag IDs, package labels and descriptions in the selected language. Package labels fall back to the language family and then English. Installed locale files take precedence over exact-version Store labels within each language. The Store extracts these labels from the built archive into `contents.tag-locales`, a language-to-ID-to-label mapping, so custom tags work before installation too. Adding a custom translated tag does not require a GUI release.

The GUI also provides shared translations for established topics such as AI/AIC/AIV/AIA, balance, bugfixes, maps, modpack, scenarios, sounds, textures, tools, behavior, economy, interface, multiplayer and replay. Known IDs keep one consistent menu label; their package labels are searchable aliases. A custom ID uses its package label, or its ID if no label is available. If packages disagree on a custom label, the menu chooses the first label in stable lexical order while searching all supplied labels. Module/plugin categories remain searchable but are separated from topic tags in the menu.

The GUI automatically derives additional facts for installed extensions: resources directory, init code, parsed configuration demands and editable options. Type and declared family membership are also searchable facets. Facts are per member: a file provider does not become “applies settings” because an Applied sibling exists. Unknown facts remain unknown.

Store definitions can supply optional `capabilities: {files, code, configuration, options}` booleans generated from the exact package contents. Old catalogs without these facts still support name/description search and available tags/type/family facets; no archive scanning or heuristic behavioral classification occurs while typing. Installed facts and installed family declarations are authoritative. Exact-version Store metadata can fill missing authored tags without retroactively imposing family selection on installed packages.

## UCP2 relationships and compatibility

The `ucp2-legacy` module stays outside every family: modules are neutral and plugins configure them. A Legacy settings family, if its author wants one, consists of Legacy preset plugins. Where no content plugin exists, "Bare" means that no preset of that family is selected, not the module itself.

The current `ucp2-legacy-defaults` package applies Legacy settings and also pulls in AI files, an AIC patch and Vanilla Fixed AIV. It is an all-in-one bundle, not a settings-only alternative, so it keeps its dependencies and meaning and stays outside the family. AI behaviour and castle applications remain independent and can depend on the Legacy module or a shared file provider without joining a family. AI Swapper's existing priority rules continue to govern its own settings.

Existing single extensions and saved setups keep their original name/version behaviour. Families absent from old definitions don't retroactively change older packages. Coordinated package updates are separate PRs with new versions; they never rewrite installed packages or profiles. Applied members can use a clearer display name such as `Apply Vanilla Fixed Castles` while keeping their technical identity.

This follows gynt's family proposal in GUI #274, the required-settings model of GUI #392, and continues the-atlan's search/tag contribution in #322. It also addresses discovery use cases discussed in #273, #310 and #236; it doesn't close every broader request in those issues.
