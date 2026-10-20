# PR #392: October 18 review follow-up

Candidate source: `c3173ff8777ca85d1e02821ff86e8989925fba04`.

Prepared desktop checks (owner `custom-hotkeys`; release between UI sessions):

1. Open the isolated October 11 game fixture with the new Windows launcher and deliberately inconsistent `conflicting-input.yml`. Expect one warning listing WASD saved preference/game value `true` to `false`, Customisations unchecked/locked, and Apply marked unsaved.
2. Apply; inspect actual YAML for sparse/full WASD `false` and unrelated Hotkeys enabled preference preserved. Reload; expect no repeated warning. Remove Custom Hotkeys through the Extensions tab; verify WASD remains off, Apply and reload again.
3. Import the conflicting input through the native file picker. Expect one repair warning. Save before launch; start unchanged store Hotkeys 0.2.1 on UCP 3.0.7 and open Options > Custom Hotkeys without the Legacy conflict.
4. Exercise a saved full-setting difference without a sparse override; confirm the load warning identifies the old/new game value and does not fabricate a user preference. Regression tests also cover added/removed defaults and absent full sections.
5. Close the test apps, restore original launcher settings and isolated game config, verify module/framework hashes, release the desktop. Record performed checks separately from planned checks.

## Provenance findings

`inactive-extension-element-click-callback.tsx` computes customisation loss from the resolved required entries, asks for confirmation, removes those user entries and only then writes the extension state. Normal activation therefore has cleanup that import did not.

Folder setup/reload uses `setupExtensionsStateConfiguration` -> `importButtonCallback` -> `importUcpConfigFile` -> `importUcpConfig`. Import and the stop/revert customisation action also reach this common loader. The loader reconstructs requirements from locally installed extension definitions, restores the sparse values, then sets the extension state. The old shared builder spread user values over requirements. The first PR revision repaired only the full values; it deliberately retained sparse values. The current revision repairs conflicting existing sparse preferences too and compares the resulting full values with the saved full snapshot.

The October 11 `prepare.py` deliberately constructed the inconsistent reproduction config with Legacy hotkeys on in both sections while Custom Hotkeys required off. It demonstrates failure to repair an already inconsistent file. It is not evidence that the launcher created the reporter's inconsistency.

The reporter's original configuration, exact save history, extension version history and route to that file remain unavailable. No upgrade, manual edit or normal activation is asserted as its cause. Changed requirement/default tests verify load behavior under changed definitions; they do not establish provenance.

## Local validation

- Full frontend suite: 113 tests, 28 files, exit 0 (bounded to two workers; no stall).
- TypeScript, changed-file ESLint and production frontend build: exit 0.
- Five warning strings exist in each of nine launcher languages; YAML and Unicode checked.
- Native/UI checks passed on the exact candidate Windows CI package. Desktop released after cleanup; no test app or process remains.

## Performed native checks

Windows/Linux CI run [39419774391](https://github.com/UnofficialCrusaderPatch/UCP3-GUI/actions/runs/39419774391) passed for the candidate head. Executable SHA256: `687006986bc6e79842c6aca1f596b67ff63db65ba70de46bffb801ee880bdfaa`. External language/game resources came from that same source checkout.

1. Folder load displayed exactly one warning. It listed WASD saved preference and saved game setting `true → false`, plus `ai_access.enabled` game setting `true → false` without a sparse override. Screenshot: `load-warning.png`.
2. Customisations showed WASD unchecked/locked and **Apply \***. Apply wrote `suggested-value: false` in sparse and `value: false` in full, retained the unrelated `ai_assaultswitch.enabled: false` preference, and corrected the full-only AI value. Screenshot and saved file: `after-apply.png`, `after-apply.yml`.
3. Native Reload produced no repeat warning and showed **Applied** with WASD still off. Screenshot: `after-reload.png`.
4. Removed Custom Hotkeys through Content. WASD stayed unchecked and became editable. Apply saved both values off and removed Hotkeys from the full load order. Native Reload again kept it off without a warning. Evidence: `after-removal.png`, `after-removal.yml`, `removal-reload.png`.
5. Used the actual Windows file picker to import `conflicting-input.yml`. One warning listed both settings as in step 1. Save-before-launch wrote the repaired sparse/full values with Hotkeys active. Evidence: `import-warning.png`, `save-before-launch.yml`.
6. Secure native startup on official UCP 3.0.7 initialized unchanged store Custom Hotkeys 0.2.1. Opened Options → Custom Hotkeys and captured its 239-action editor: `secure-game-editor.png`. Error log contains only its header. `secure-startup-config.yml` retains both repaired values. Native log and runtime hashes: `ucp3.log`, `signed-runtime.json`.

The inherited fixture initially contained a developer `ucp.dll`, which raised a developer warning before initialization; that attempt is not counted as a passed startup. Closed the warning, cleaned up its aborted process and released the desktop for investigation. For the accepted run, used `ucp.dll` from the official 3.0.7 release archive (SHA256 `cc4ca5b7cd61e281a693a94c6f5a404680e34e950b015419218f10dd8a5f91af`), matching release `code.zip`, `lua.dll` and loader. Added the already-published store signatures for the unchanged module ZIPs using the same `.zip.sig` format as the launcher's installer. Native startup used `--ucp-security`; no developer warning was approved. RPS was unchanged. An isolated WebView profile avoided the unrelated launch-data override inherited by the first attempt.

Both accepted-run apps exited normally. Restored original launcher settings, isolated game config, original fixture runtime and signatures; verified baseline hashes. Final desktop release: 14:30:54 CEST, 20 October 2026. Tests here cover the launcher load/startup revision; gameplay, multiplayer, replay and the stop/revert button were not separately exercised in this native session. The stop/revert path was verified to share the tested importer.
