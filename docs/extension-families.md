# Search, tags and extension families

Store and Content search technical/display names, tag labels and descriptions in the selected GUI language. Prefixes, name substrings, quoted phrases and bounded typo matching are supported. Separate words combine with AND; the compact Tags button offers Any/All sword-checkbox selection. Filtering never activates an extension or changes its preferred version.

Description lookup is shared with the viewer and cached per identity/language/source. Older catalogs with remote descriptions load in the background with at most four concurrent reads. Loading/incomplete status is visible and cached fallback text remains usable. Installed descriptions are read again after extension discovery reload. The existing Markdown parser supplies searchable visible text; the existing MiniSearch dependency supplies approximate matching.

## Author a family using ordinary extensions

Add an optional `family` list to the existing `definition.yml`. One extension identity declares `root: true`; the modder chooses that root freely. It may be Default/Applied, Bare/files or a bundle. Root activation means normal activation of that extension and its declared dependencies.

An Applied display root:

```yaml
name: example-default
version: 1.0.0
type: plugin
dependencies:
  example-files: '^1.0.0'
family:
  - name: example-family
    root: true
tags: [ai, aic]
```

The shared-file member:

```yaml
name: example-files
version: 1.0.0
type: plugin
family:
  - name: example-family
tags: [ai]
```

Each retains its ordinary `config.yml`, `options.yml`, locales, dependencies and name/version. There is no new configuration ID or qualified dependency syntax. Family membership does not imply exclusivity, compatibility, inheritance, priority or installation of all members. Bundle behavior is expressed by the root's ordinary dependency list. Required/suggested settings and conflicts remain governed by the existing configuration assembly and override controls.

Put shared assets in one file-providing extension. Applied members depend on it and reference its existing resource path, for example `ucp/plugins/example-files/resources/ai/...`. The display root does not have to own the files. Do not make a Bare member depend on a preset-applying root and expect that dependency's customizations to disappear.

Members can live in separate directories of the same repository. The existing Store recipe's `contents.source.location` selects each extension directory for packaging. Member packages contain their metadata/configuration; they do not need duplicate copies of shared resources. No nested virtual installation or new filesystem mount is introduced.

## Root availability and interaction

- Content collapses a family only when the declared root is installed, whether active or inactive. If only members are installed and the root is available in Store, Content leaves those members flat; Store can still group the available family.
- The chevron expands/collapses. Existing activation arrows act on the root or the individual expanded member. Name clicks still open details. No action silently replaces siblings.
- Multiple memberships produce references to the same extension state, not duplicate installations. Several versions of the same root name are allowed; two different root identities for one family fall back to flat display. Malformed family metadata does not hide an otherwise usable extension.
- Search matches members independently before grouping. A nonmatching installed root remains context for a matching child. Search expansion is separate from the user's normal expansion state.
- Grouping/sorting never changes the underlying activation order. Active rows retain their actual priority positions and existing movement controls; a family is not a new atomic load-order item.

## Tags and automatic metadata

`tags` is an optional list of stable identifiers. IDs are normalized; known labels are localized and unknown IDs remain readable. Current labels include AI/AIC/AIV/AIA, balance, bugfixes, code, config, maps, modpack, scenarios, sounds, textures, tools and behavior.

The GUI automatically derives additional facts for installed extensions: resources directory, init code, parsed configuration demands and editable options. Type and declared family membership are also searchable facets. Facts are per member: a file provider does not become “applies settings” because an Applied sibling exists. Unknown facts remain unknown.

Store definitions can supply optional `capabilities: {files, code, configuration, options}` booleans generated from the exact package contents. Old catalogs without these facts still support name/description search and available tags/type/family facets; no archive scanning or heuristic behavioral classification occurs while typing. Installed facts are authoritative for installed files. Exact-version Store metadata fills missing authored tags/family metadata, while explicit empty local lists remain empty.

## UCP2 example and compatibility

The existing UCP2 pattern naturally fits: a Defaults/Applied display root can depend on the AI file provider, AIC patch and chosen AIV members using their existing manifests. Alternative castle members remain individually selectable. The existing AI Swapper custom-object consumer determines how their control flags and priorities compose; a family field does not change those rules.

Use isolated example copies for preview, not edits to published packages. Existing single extensions and saved configurations keep their original name/version behavior. No package/profile migration or replacement release is part of this feature.

This follows Gynt's family proposal in GUI #274 and continues the-atlan's search/tag contribution in #322. It also addresses discovery use cases discussed in #273, #310 and #236; it does not close every broader request in those issues.
