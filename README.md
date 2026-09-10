# Launcher folder access: R034 and R035

Implementation PR: https://github.com/UnofficialCrusaderPatch/UCP3-GUI/pull/381

Issues: #379 (R034), #380 (R035). Source under test: `3dc2933f2476e217be76f876c03f6eaf0bd0ba90`, based on upstream `009ee71fe3a5229e75b2dc7a10d2ef5141217bc8`. One PR shares the existing folder control and the scoped host command. No game reconstruction or OpenSHC prerequisite arose.

## Artifacts and capture provenance

Native Windows baseline: released 1.0.17, tag commit `0a9a9fc`; extracted NSIS executable SHA256 `DA1D0ED93D15065615273FE65BCFC7A6254C295849C256B901A7E2817FAFA5FE`. This is a released UI comparison, not an exact-base binary-size comparison.

Final installable Windows/Linux artifacts: [CI run 34502444384](https://github.com/UnofficialCrusaderPatch/UCP3-GUI/actions/runs/34502444384), at the full source head above. Both jobs passed. [Linux no-graphics build 34502444411](https://github.com/UnofficialCrusaderPatch/UCP3-GUI/actions/runs/34502444411) also passed. Artifact GUI label is 1.0.16, inherited from the branch; this PR does not change version metadata.

Final Windows executable SHA256: `61B8316B413F10F16E38E37A51AC7F76B06ECD18452A3E5E90959DE2E5E84200`.

Final Linux AppImage extracted executable SHA256: `E1C3E2C50CA7FA0E429EEA7840AB2FDF23630B1518C87C04B4EF43799984B7FA`.

Screenshots are real native captures from the Windows computer-use surface, including WSLg windows for Linux. They are not browser mocks or generated pictures. Linux was Ubuntu 24.04 under WSLg with Thunar and `WEBKIT_DISABLE_COMPOSITING_MODE=1`; the AppImage is the unmodified Ubuntu 22.04 CI artifact, run through its extracted AppRun. WSLg captures include surrounding desktop pixels. No claim is made for every Linux desktop/file manager.

The licensed game copy and synthetic plugins stayed local. Fixture folder: `Spiel Ä Test`, with real installed module ZIPs and directory plugins. Two synthetic directory versions `folder-check-1.0.0` and `folder-check-2.0.0` use the display name `Ordnerprüfung – Erweiterung mit langem Namen ÄÖÜ 日本語`; version 1 is active, and they contain no game code. The underlying UCP version is 3.0.7 (`77c6accf`). No gameplay compatibility claim follows from these launcher checks.

## Acceptance results

| Check | Evidence and result |
| --- | --- |
| R034 root access | Final Windows build: keyboard Enter opens exactly the selected fixture's `ucp` directory in Explorer. Final Linux build: toolbar button opens that fixture's `ucp` directory in Thunar. No folder is created. |
| R035 installed archive | Windows packaged build `7134f71` selects `aicloader-1.1.2.zip` in Explorer via the actual GUI/IPC command. Windows opener code is unchanged in final head. Final Linux GUI opens `ucp/modules`, as the containing-folder action promises; it does not execute the ZIP. |
| Active plugin / Creator preservation | Final Windows GUI selects `folder-check-1.0.0` in normal mode. After the existing Creator toggle is enabled, the single folder control opens that directory directly, with the original label. |
| Active/inactive module and plugin combinations | Frontend regressions check both module states, Creator active plugin, inactive plugin/version changes, and the structured host arguments. Native examples cover inactive archive and active directory plugin; not every combination was separately exercised natively. |
| Stale, missing, two installations, uninstalled | Frontend tests change selected installation and extension/version without retaining old arguments, disable absent/unconfigured roots, suppress uninstalled store entries, and handle host rejection. Native Rust tests reject paths from another installation, absent paths, scope denials, traversal, URLs and executables. Final Windows GUI after temporarily renaming the installed ZIP displays the German error dialog; the ZIP was restored. |
| Native boundaries | Final production path/opener functions were extracted verbatim into a documented minimal Rust harness: 3 native Windows tests and 6 native Linux tests passed. Linux includes canonical symlink scope and immediate-error/long-lived-file-manager behavior. Harness does not emulate Tauri current-selection state or filesystem scope; packaged GUI checks above exercise that boundary. CI builds the complete Tauri application, but its workflow does not run `cargo test`. |
| Localization | 5 added keys each in English/German; actual YAML decoding, unique keys, non-ASCII text and all 7 other catalogs' existing English fallback checked. Those catalogs are not claimed translated. Human translation review remains welcome. Native English/German, long labels, tooltip, status and error were inspected. |
| Layout and keyboard | Final Windows German 800×630 minimum and 1024×768 default pass: compact icons, long-name ellipsis, readable errors, visible focus ring/status/tooltip, Enter activation. Native 110%, 150% and 200% inspected. At 150% default size, both baseline and candidate exceed the viewport; baseline/candidate comparison is attached. At 200% maximized, new folder controls remain visible; existing vertical overflow remains. |
| Regressions and build | 103 frontend tests across 27 files pass; 16 are dedicated control/localization tests. TypeScript, changed-file lint/commit hooks, production Vite build and all 3 final CI build jobs pass. Existing Vite eval/chunk warnings remain. |

The packaged Linux test exposed inherited AppImage GLib/GTK environment variables breaking the system Thunar process. The final host clears those bundle variables for the opener. It also observes startup for up to 500 ms instead of waiting until a newly started file manager closes; errors after that window are logged. Both the original failure and final successful GUI actions were observed. The intermediate error image is not an accepted after screenshot.

## Pictures

- [Before, English 1024×768](before-native-en-1024x768.png): released 1.0.17, normal mode.
- [After, English 1024×768](after-native-en-1024x768.png): packaged `7134f71`, normal mode. Frontend is unchanged between this commit and final head (only Linux Rust host behavior changed).
- [Final German keyboard focus](final-native-de-keyboard-focus.png): `3dc2933`, default size, native tooltip/status and focus ring.
- [Final German minimum size](final-native-de-800x630.png): `3dc2933`, 800×630.
- [Final German missing-module error](final-native-de-missing-module.png): `3dc2933`, minimum size.
- [Windows actual GUI archive selection](windows-gui-archive-selection.png): packaged `7134f71`.
- [Final Windows active plugin selection](windows-gui-active-plugin-final.png): `3dc2933`.
- [Final Linux actual GUI root opening](linux-gui-root-final.png): `3dc2933` AppImage.
- [Final Linux actual GUI containing-folder opening](linux-gui-module-final.png): `3dc2933` AppImage.
- [Baseline at 150% default size](before-native-de-150-default-overflow.png): released 1.0.17; Creator mode enabled.
- [Candidate at 150% default size](after-native-de-150-default-overflow.png): packaged `7134f71`; normal mode. Both share the viewport overflow; the differing Creator setting does not change overall pane dimensions.
- [Candidate at 200% maximized](after-native-de-200-maximized.png): packaged `7134f71`, German.

## Size, cost and ownership

Exact-base production JS entry: 1,418,554 bytes (`index-CL3tLNk4.js`) → 1,420,059 bytes (`index-B6Rsud07.js`): **+1,505 bytes**. No dependencies or lockfiles changed. Final Windows installer is 4,006,835 bytes; released 1.0.17 baseline installer is 4,003,482 bytes, but these are different source/version baselines and that delta is not attributable solely to this PR.

Code-path inspection: one cached OS query for labels; existing selected-folder/existence atoms reused; no new directory scan or timer during rendering. Filesystem validation and process creation happen only on explicit click. Linux's bounded 20×25 ms startup observation runs on Tauri's blocking executor, followed by a child reaper only if needed. No general startup/throughput benchmark or game hot-path claim is made.

Only folder controls, host file support/registration, 10 locale entries, dedicated tests and one changelog entry are changed. Existing owners of PRs #322, #363, #376 and #377 remain in place; all four were still open on final inspection. Original workspace/branch and all other worktrees were preserved. Screenshots and this note live on a separate evidence branch and are not packaged in the application.
