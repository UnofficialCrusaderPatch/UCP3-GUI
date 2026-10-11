# GUI 1.0.17 integration preview

This branch combines the reviewed GUI contributions for a complete preview build. It is not the withdrawn `v1.0.17` release and does not replace that tag. Numeric package version 1.0.17 is used for compatibility; download artifacts from this branch's exact CI run. Original contributor commits are preserved through merges.

The [user-facing 1.0.17 changelog](changelog/1.0.17.md) summarizes the visible changes in plain language. It remains a preview draft until release preparation is complete.

| Contribution | Included source head |
| --- | --- |
| Search, tags, families (#382; retains #322) | `deeff6c` (atomic family switching, translated family/configuration labels, combined filter, whole-word search and a flat active list; includes current upstream scrollbar fixes) |
| Folder controls (#381) | `bd65b17a3f46e791ec4d41d078f5afd55eb5703d` |
| Dependency trees (#377) | `c9719ca4b21b728de2d659144c1ca746edffd13d` |
| Required settings after reload (#392) | `eb701a2d6892a8731ad740ca464b6e5882edf900` |
| Dependency-safe Store removal (#393; fixes #386 and #387) | `84abaf8` (explained removal locks, active-extension confirmation, save before deletion and pinned dependency edges) |
| Scrollbar hook and number-input spacing (#384, merged upstream) | `6ba339263257ab48cf1b5ff86f70b578888c356f` |
| Update notice/Linux dependencies (#378) | `0a433cac8450ecfbf4dc71f0d3d3d63983fbc849` |
| Game language environment (#376) | `c017880d9b08db56f200e0d47bdc4f6040e4614a` |
| Custom menu binary assets/configuration (#363) | `03805054e24eca20ce8c841bc694ab15e93574b1` |
| Fresh-install Store updates (#364) | `b0646a84d9f35a03c38e9aab7805bd20ffa82960` |
| macOS builds (#326) | `48afb82a8964e35766d84c85aab6e318f7528752` |
| Reviewed declarative-modal continuation of #159 | `a011977c1cc7cf376ba8eb7bd1e4444e0e7ee89a` |

The #159 row uses `contrib/pr159-declarative-modal`, which contains the completed continuation rather than the old original draft head. Locale additions are combined, both folder and texture-metadata Rust commands are registered, and the Content family rows retain the folder controls and actual load-order movement arguments.

Upstream main now supplies the folder path-boundary tests. Integration follow-ups add a dependency-view regression through the actual activation/deactivation callbacks and installed-version changes, localized update notices in all nine catalogs, and clean Ubuntu 22.04 package installation/startup in CI. Native discovery acceptance found and corrected parchment text contrast; resource metadata also handles ZIPs without explicit directory entries. These follow-ups are confined to the preview branch or the feature PR, leaving the other contributors' branches intact.

Native preview checks also found and corrected popup placement under the existing CSS GUI zoom, and gave activation/movement controls explicit dimensions so nested family rows retain usable buttons. Family chevrons override the shared minimal-button reset and use a symbol-capable font. These checks use an isolated local fixture; existing game installations are not modified.

Package metadata rollout is coordinated through separate draft package and Store PRs. Existing installed packages and profiles are not rewritten; game testing is outside this preview. The modder chooses Default, Bare or any other ordinary extension as root. One explicit configuration is selected per family, with neutral shared providers retained as ordinary dependencies. Indirect competing presets are reported. CI tests/builds and runtime acceptance are recorded on the preview PR, distinguishing completed checks from platform-specific limitations.
