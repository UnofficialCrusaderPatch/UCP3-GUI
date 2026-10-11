# Required Legacy hotkey settings: native acceptance

GUI PR: https://github.com/UnofficialCrusaderPatch/UCP3-GUI/pull/392
Module PR: https://github.com/Krarilotus/extension-custom-hotkeys/pull/16

Two independent defects were reproduced. The tester reported the WASD option was already off, but their saved configuration was not supplied. These checks establish the defects and fixes, not the exact cause of that person's failure.

## Reproduction configs

These are the exact input files used for the native checks below, including their dependency versions. They contain only extension settings and load order, with no personal paths or player data. Use a test installation with UCP 3.0.7 and the listed extension versions; keep a copy of its existing `ucp-config.yml` before replacing it. The screenshots below already document these checks; adding the files does not imply another native test run or a new release.

### Launcher PR #392: saved WASD-on preference overrides required OFF

Download [ucp-config-required-off.yml](ucp-config-required-off.yml), place it in the test game folder as `ucp-config.yml`, and reload that folder's configuration in the launcher. Leave Save before launch enabled.

- Before the fix: the WASD/quicksave option is checked despite being locked OFF by Custom Hotkeys. Saving writes `config-full.modules.ucp2-legacy.config.o_keys.enabled.contents.value: true`; launching fails with `activation.legacy-hotkeys`.
- With PR #392: the option is unchecked and saving writes that full value as `false`. The sparse section retains the original preference as `suggested-value: true`; this is intentional and restores the user's preference when Custom Hotkeys is removed. The unchanged store module starts successfully and Options > Custom Hotkeys opens.

The OFF requirement comes from Custom Hotkeys' installed schema, not from an artificial requirement added to this example. This input file has SHA256 `8a726420d3df09a9b690315e949fc14b6e1aa85a1043283054e664d3789b4921`.

### Custom Hotkeys PR #16: omitted WASD setting falsely reports a conflict

Download [ucp-config-omitted-wasd.yml](ucp-config-omitted-wasd.yml) and place it in the test game folder as `ucp-config.yml`. It has Legacy active but no `o_keys` entry in either configuration section. Launch directly, or turn Save before launch OFF for this check so the launcher does not fill in the omitted setting.

- Before the fix: published Custom Hotkeys 0.2.1 reports `activation.legacy-hotkeys`, although Legacy 2.15.1 leaves its WASD changes disabled.
- With the module built from PR #16: the identical config starts successfully and Options > Custom Hotkeys opens. The saved config does not need to be changed.

The local candidate retained version 0.2.1 only for the isolated test. The PR has not published a replacement store package. This input file has SHA256 `64e501e64b5c0da7e9bbbccdf0c80bd5decf40328de966ab398401fc468c3004`.

## Launcher precedence

Baseline Windows launcher source `3dc2933f2476e217be76f876c03f6eaf0bd0ba90` (the merged folder-access change; its configuration builder is unchanged on current main `601e9480740ab5e946ea32f9738f0ae6ccd4fe60`). Executable SHA256: `61b8316b413f10f16e38e37a51ac7f76b06ecd18452a3e5e90959de2e5e84200`.

Candidate `eb701a2`, Windows artifact from successful [CI run 38103527726](https://github.com/UnofficialCrusaderPatch/UCP3-GUI/actions/runs/38103527726). Windows executable SHA256: `b15685fbbb2e8fb847dffbc2af2ab635f88e6af5b4d1b7cdf38986c2ea546a63`. Windows/Linux builds and their frontend suites pass.

Both used the same initial configuration: active Custom Hotkeys 0.2.1 plus Legacy 2.15.1 and a saved user WASD value of true. The published Custom Hotkeys package was unchanged: SHA256 `2d32d86a201ee0b53272a4978f026fba304a2de0a199eb06e754301b8706c6f8`.

Before: restoring the configuration shows WASD checked and locked, with the message that Custom Hotkeys requires false. Normal save-before-launch writes true to the full game config and the game fails with `activation.legacy-hotkeys`.

After: restoring the same input shows WASD unchecked and locked. Normal save-before-launch writes false to the full game config, while preserving the original user preference in sparse config. The unchanged module starts and Options > Custom Hotkeys opens its editor. Native launcher Reload retains the off value.

100 frontend tests across 27 files pass, including five new regression cases that fail before the fix. Changed-file lint, TypeScript and production frontend build pass. Native tests covered restoring, save-before-launch and Reload; the import file picker was not separately exercised. The common state-writing path used by import is covered by the regressions.

## Module preflight

Published 0.2.1 baseline versus local candidate built by the existing packager from source `a75132b`, retaining version 0.2.1 solely for an isolated test. This local candidate is not a new published release.

Native checks used the same byte-identical config file with Legacy active and `o_keys` omitted. SHA256 `64e501e64b5c0da7e9bbbccdf0c80bd5decf40328de966ab398401fc468c3004`.

Before: the published module rejects it with the Legacy conflict message. After: the candidate starts and opens Options > Custom Hotkeys. A separate candidate launch with `o_keys.enabled=true` still rejects before patch activation. The launcher fix's accepted startup separately exercises explicitly false with the published module.

627 module tests and CI pass. This change matches the released Legacy 2.15.1 port-enable predicate: enabled=true on the option or an immediate child enables the port; omitted values are off. Invalid non-boolean settings retain rejection through the existing localized configuration-error message. Inactive version sections do not enable a port.

## Ownership and limits

The GUI fix uses `buildExtensionConfigurationDB`'s existing `configuration.locks` in `generateAndSetFullConfig`; it changes neither extension resolution nor serialization. The module fix only changes startup configuration checks. Legacy 2.15.1's actual init/enable implementation and UCP 3.0.7's config normalization/load/enable callers were inspected; Legacy exports no separate port-state query API. No private merger, scanner, address table, hook, native API, dependency or per-frame work was introduced. Legacy, framework, UI, Recorder and multiplayer paths remain unchanged in these diffs.

Native fixture: isolated copy of licensed Crusader 1.41 (Steam), UCP 3.0.7, LuaJIT 1.0.0, cffi 1.0.0, winProcHandler 1.0.0, graphicsApiReplacer 1.3.0 and UI 1.0.1. Actual Windows Computer Use captures; no browser mock or generated images. Editor was opened by its Options entry. Injected F12 did not open it during the candidate check; no new keyboard-only acceptance is claimed. Multiplayer, replay and Extreme were not retested for these startup/configuration-only changes.

Desktop queue ownership was asserted before each native call and released between fixtures and background work. Own applications were closed, launch toggles restored and the original launcher folder list restored. Other test installations and Legacy source were untouched. Screenshots are on a separate evidence branch and are not added to either production PR or package.
