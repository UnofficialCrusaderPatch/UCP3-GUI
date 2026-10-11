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

Initialization failures are reported in the GUI footer with Retry and Close;
Save stays disabled. Retry recreates the sandbox and discards its unsaved menu
state. If files or manifests were repaired, close the menu and Reload Content
first to invalidate cached asset results. Late responses from a destroyed menu
cannot mark a replacement ready or save into its configuration.

Return configuration from `SANDBOX_FUNCTIONS.getConfig()`, synchronously or as a
promise. Reject a promise to report invalid configuration; the host displays the
error and leaves the menu open. Setting a returned field to `undefined` clears
that user override and restores the active content's default, if present.
Required fields supplied by active content cannot be changed by a custom menu.

No new metadata API is required. `getCurrentConfig()` already returns `user`
overrides and `baseline` entries. For each baseline entry,
`entry.modifications.value` contains `content`, `qualifier` and `entityName`;
`qualifier === 'required'` identifies a locked value.

Creator menus may return a map of `required`/`suggested` values from
`getConfigQualifiers()`. Save reads that map together with `getConfig()` and uses
the existing Creator-mode checks; ordinary menus need not implement it.

## Texture catalog inputs

`HOST_FUNCTIONS.getTextureCatalogInputs()` returns a promise for:

```typescript
{
  packs: {
    name: string;
    root: string;
    paths: string[];
    manifest: unknown;
  }[];
  metadata: Record<string, { count: number; kind: number; palette?: string }>;
}
```

This API is optional on older GUI versions. Consumers must check for its presence
and either retain their older discovery path or explain the minimum GUI
requirement. The initial consumer is the development textureSwapper 0.1.0
hierarchical menu, tracked by [the texture module work](https://github.com/UnofficialCrusaderPatch/UnofficialCrusaderPatch/issues/76).
That development version is not a claim of a published compatible release.

`packs` includes active directory plugins containing
`resources/textures/manifest.json`, in current Content display order (highest
priority first). `name` is the extension's technical name. `root` and every
`paths` entry use forward slashes relative to the selected game directory;
`manifest` is the parsed JSON object, interpreted by the consumer. Paths describe
available assets, not winning textures or saved choices. The metadata map uses
the same game-relative paths and includes base-game `gm/*.gm1` entries plus GM1s
from the selected packs. `count` and `kind` are GM1 header values; `palette`, when
present, is the base64-encoded palette bytes for kind 2. Pixel payloads are not
read by catalog preparation. No packs returns empty packs and metadata.

In-flight preparation is shared with the background preloader. Add/remove/order
changes update the returned pack list; cached reads may be reused within the
same discovery generation. Reload Content or changing installation invalidates
the scope. Editing an asset on disk therefore requires Reload, including after
an earlier read failed. Missing/invalid manifests, unreadable files, invalid GM1
headers, and stale preparation reject the promise. Background preparation does
not open error dialogs; a requesting menu handles the rejection, or its
`whenReady()` lets the host display initialization failure. Retry alone does not
invalidate the catalog.

Configuration is never cached here. Reconstruct priorities and choices from
`getCurrentConfig()` each time; removing a pack must not silently discard saved
choices referring to it.
