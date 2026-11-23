# Extension families and tags

A family is a launcher-only choice between alternative **plugins**, such as Bare and Applied: only one member is active at a time. The game and the framework never see families; they load the flat load order the launcher writes. Use a family only for alternative configurations of the same thing. Combinable features and shared file providers use ordinary dependencies and tags.

## Author a family

The root plugin owns the family and lists every other member. Members only name the family.

```yaml
# Root, here the files-only Bare plugin
name: example-bare
version: 1.0.0
type: plugin
dependencies:
  frontend: '>=1.0.17 <2.0.0'
family:
  - name: example-family
    root: true
    members: [example-applied]
    default: example-applied # optional: the member offered first
```

```yaml
# Member
name: example-applied
version: 1.0.0
type: plugin
dependencies:
  frontend: '>=1.0.17 <2.0.0'
  example-bare: '^1.0.0'
family:
  - name: example-family
```

The launcher enforces:

- **Plugins only.** Family declarations of modules are ignored with a warning.
- **The root decides.** A plugin is a member only if the root lists it in `members`. Every root version that declares the family must list the same members; otherwise the family is ignored with a warning. An older root version without a family declaration can still be active; the members then still count as the family's choice, but the Extension Manager shows them as separate rows without the family switch. Other declarations are ignored with a warning. A family with no root, or with several plugins claiming `root: true`, is ignored and its members appear as ordinary plugins.
- **One choice per family.** A member the player selected, or an active member that applies settings, is the family's choice. A files-only member that another member depends on (Bare under Applied) stays loaded as a provider.
- **Same save-state modules.** Members must bring in the same modules that declare `save-state` ([save-state.md](save-state.md)); stateless modules may differ. A switch, import, saved-setup choice or upgrade that changes the save-state modules a chosen family brings in is refused.
- **Safe switching.** A switch is refused while an extension outside the family requires the member being replaced. Otherwise one confirmation lists the extensions that are added, removed or change version, and any setting a required value changes.

A saved setup that selects two members of one family asks which one to keep; nothing loads until the player chooses.

## Labels and tags

In each `locale/<language>.yml`, `family.example-family: Example` and `family.example-family.configuration: Applied` label the family and member. `tags` is an optional list of IDs, labelled with `tags.<id>` keys (`tags.castles: Burgen` in `locale/de.yml`). Supported languages: `en`, `de`, `fr`, `ru`, `hu`, `tr`, `ch`, `es` and `fa`. Search covers names, labels, tags and descriptions in the selected language.

A family guarantees one choice among its own members only. Plugins outside it can still require values for the same settings, and the ordinary priority rules decide between them.
