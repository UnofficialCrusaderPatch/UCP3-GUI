# Save-state declaration

Map Extensions owns save files. If your module writes its own data into saved games, declare that in its `definition.yml`. The launcher can then warn players before they remove the module:

```yaml
save-state: required   # saves made with this module refuse to load without it
# or
save-state: optional   # saves still load without it; its saved data is dropped
```

## Which value to use

- **Leave it out** if the module writes nothing into saves. Settings don't count, because changing settings never invalidates a save.
- **`optional`** is the normal choice for a module with save data. Without the module the game continues with vanilla behaviour, and its saved data is dropped the next time the player saves.
- **`required`** only if continuing without the module would corrupt the match. Improved Tunnelers' tunnels are an example.

Use the same choice you register with Map Extensions: a required section means `required`, and an optional section (vanilla fallback) means `optional`.

## What the launcher does

- It reads only this declaration and never opens save files.
- Before a declared module leaves the setup, it asks OK/Cancel and names the module: "saves made with X need X". Cancel changes nothing. This happens when:
  - the player deactivates the module, or an extension that pulled it in as a dependency;
  - the player uninstalls it, active or not, because deleting the files also breaks saves made with it;
  - the player switches to another family member.
- A different version of the same module doesn't count as a removal. Map Extensions admits saves by provider id and schema, not by version.
- Values other than `required` or `optional` are ignored, and discovery logs a warning. Plugins have no code, so `save-state` on a plugin is ignored too, also with a warning.
- The launcher only warns. Map Extensions decides whether a save loads when the player loads it. If a required module is missing, Map Extensions refuses the save before the world loads.

## Families

Family members must not differ in which save-state modules they bring in, so that switching between them never breaks a save. See [extension families](extension-families.md).
