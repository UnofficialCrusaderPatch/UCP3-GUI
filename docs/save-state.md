# Save-state declaration

A module that writes its own data into saved games declares it in `definition.yml`:

```yaml
save-state: required   # saves made with this module refuse to load without it
# or
save-state: optional   # saves still load without it; its saved data is dropped
```

- Leave it out if the module writes nothing into saves. Settings don't count.
- `optional` is the normal choice: without the module the game continues with vanilla behaviour.
- `required` only if continuing without the module would corrupt the match, as with Improved Tunnelers' tunnels.

Use the same choice you register with Map Extensions: a required section means `required`, an optional one `optional`. The launcher warns before a declared module leaves the setup or is uninstalled; Map Extensions decides whether a save loads. Other values, and `save-state` on a plugin, are ignored with a warning.
