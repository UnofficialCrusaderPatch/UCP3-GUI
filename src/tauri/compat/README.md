# Tauri v1 compatibility layer

The app was written against the Tauri v1 JS API (`@tauri-apps/api/fs`,
`/http`, `/os`, `/shell`, ...). Tauri v2 moved most of these into separate
plugins with different shapes. The modules in this folder re-expose the
**v1-shaped API** on top of the v2 packages, so the rest of the code base
keeps its calling structure and only the import path changes:

| v1 import                   | compat module      | v2 backing package                                      |
| --------------------------- | ------------------ | ------------------------------------------------------- |
| `@tauri-apps/api/fs`        | `compat/fs`        | `@tauri-apps/plugin-fs`                                 |
| `@tauri-apps/api/http`      | `compat/http`      | `@tauri-apps/plugin-http`                               |
| `@tauri-apps/api/os`        | `compat/os`        | `@tauri-apps/plugin-os`, `api/path`                     |
| `@tauri-apps/api/shell`     | `compat/shell`     | `@tauri-apps/plugin-shell`                              |
| `@tauri-apps/api/clipboard` | `compat/clipboard` | `@tauri-apps/plugin-clipboard-manager`                  |
| `@tauri-apps/api/dialog`    | `compat/dialog`    | `@tauri-apps/plugin-dialog`                             |
| `@tauri-apps/api/tauri`     | `compat/tauri`     | `@tauri-apps/api/core`                                  |
| `@tauri-apps/api/window`    | `compat/window`    | `@tauri-apps/api/window`/`webviewWindow`                |
| `@tauri-apps/api/event`     | `compat/event`     | `@tauri-apps/api/event` (file-drop → drag-drop mapping) |
| `tauri-plugin-upload-api`   | `compat/upload`    | `@tauri-apps/plugin-upload`                             |

`@tauri-apps/api/path`, `/app` and `/mocks` are API compatible in v2 and are
still imported directly.

New code may use the v2 APIs directly; the shims can be removed module by
module once nothing imports them anymore.
