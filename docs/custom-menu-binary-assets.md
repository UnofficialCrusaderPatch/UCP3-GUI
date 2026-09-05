# Binary assets in CustomMenu

CustomMenu uses the existing sandbox interface. Menus can read game-relative
binary files through `HOST_FUNCTIONS.getBinaryFileBase64(path)` and decode the
returned base64 string:

```javascript
const encoded = await HOST_FUNCTIONS.getBinaryFileBase64('gm/tile_castle.gm1');
const bytes = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
```

The host uses the current game folder and existing Tauri filesystem permissions.
Absolute paths and parent traversal are rejected. Unreadable files reject the
promise. This API does not decode game formats, write files or apply textures.

`getAssetUrl` remains appropriate for browser-supported images. Fetching binary
files from that URL in the sandbox is different: Tauri 1.x allows the main window
origin on asset responses, while the sandbox has an opaque origin. The binary
reader transfers bytes over the existing sandbox connection without broadening
the iframe's origin or the application's content security policy.

## Asynchronous initialization

Menus that need to load assets before saving can optionally provide
`SANDBOX_FUNCTIONS.whenReady()`, returning their initialization promise. The host
keeps Save and Save & Close disabled until it resolves. Existing menus without
this method retain their existing initialization behavior.

Return configuration from `SANDBOX_FUNCTIONS.getConfig()`, synchronously or as a
promise. Reject a promise to report invalid configuration; the host displays the
error and leaves the menu open. Setting a returned field to `undefined` clears
that user override and restores the active content's default, if present.
Required fields supplied by active content cannot be changed by a custom menu.

No new metadata API is required. `getCurrentConfig()` already returns `user`
overrides and `baseline` entries. For each baseline entry,
`entry.modifications.value` contains `content`, `qualifier` and `entityName`;
`qualifier === 'required'` identifies a locked value.
