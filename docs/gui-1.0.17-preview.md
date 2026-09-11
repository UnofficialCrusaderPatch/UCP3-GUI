# GUI 1.0.17 integration preview

This branch combines the reviewed GUI contributions for a complete preview build. It is not the withdrawn `v1.0.17` release and does not replace that tag. Numeric package version 1.0.17 is used for compatibility; download artifacts from this branch's exact CI run. Original contributor commits are preserved through merges.

The [user-facing 1.0.17 changelog](changelog/1.0.17.md) summarizes the visible changes in plain language. It remains a preview draft until release preparation is complete.

| Contribution | Included source head |
| --- | --- |
| Search, tags, families (#382; retains #322) | `ff683b95e1cf844d2b3babcf4382f9d422a4d340` (combined filter, whole-word search, left-column layout, Creator toggle and package-owned translated tags) |
| Folder controls (#381) | `f33952242b6e7d2a2286419b5a447c9ecc832652` |
| Dependency trees (#377) | `b9924f3c78152890877bee8326f31907d17f3e09` |
| Update notice/Linux dependencies (#378) | `0a433cac8450ecfbf4dc71f0d3d3d63983fbc849` |
| Game language environment (#376) | `c017880d9b08db56f200e0d47bdc4f6040e4614a` |
| Custom menu binary assets/configuration (#363) | `03805054e24eca20ce8c841bc694ab15e93574b1` |
| Fresh-install Store updates (#364) | `b0646a84d9f35a03c38e9aab7805bd20ffa82960` |
| macOS builds (#326) | `48afb82a8964e35766d84c85aab6e318f7528752` |
| Reviewed declarative-modal continuation of #159 | `a011977c1cc7cf376ba8eb7bd1e4444e0e7ee89a` |

The #159 row uses `contrib/pr159-declarative-modal`, which contains the completed continuation rather than the old original draft head. Locale additions are combined, both folder and texture-metadata Rust commands are registered, and the Content family rows retain the folder controls and actual load-order movement arguments.

Integration follow-ups add durable Rust path-boundary tests, a dependency-view regression through the actual activation/deactivation callbacks and installed-version changes, localized update notices in all nine catalogs, and clean Ubuntu 22.04 package installation/startup in CI. Native discovery acceptance found and corrected parchment text contrast; resource metadata also handles ZIPs without explicit directory entries. These follow-ups are confined to the preview branch or the feature PR, leaving the other contributors' branches intact.

Native preview checks also found and corrected popup placement under the existing CSS GUI zoom, and gave activation/movement controls explicit dimensions so nested family rows retain usable buttons. Family chevrons override the shared minimal-button reset and use a symbol-capable font. These checks use an isolated local fixture; existing game installations are not modified.

Package metadata rollout is coordinated through separate draft package and Store PRs. Existing installed packages and profiles are not rewritten; game testing is outside this preview. UCP2 family manifests are isolated examples; the modder chooses Default, Bare or any other ordinary extension as root. CI tests/builds and runtime acceptance are recorded on the preview PR, distinguishing completed checks from platform-specific limitations.
