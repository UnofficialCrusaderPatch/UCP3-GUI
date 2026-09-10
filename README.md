# PR #377 screenshot evidence

Review-only images for [UCP3-GUI PR #377](https://github.com/UnofficialCrusaderPatch/UCP3-GUI/pull/377).
This independent evidence branch is not part of the application PR or distribution.

Both screenshots were captured at 1024 x 768 in a browser fixture importing the
actual ExtensionViewer, resolver, overlay, English localization, font and CSS.
Extension descriptions/data and host filesystem/event I/O are mocked. The banner
inside each screenshot identifies the fixture. These are not native Tauri or
in-game screenshots.

- `initial-draft-9cde2d0.png`: first implementation at `9cde2d0`, with a permanent
  heading/list. This is an earlier PR iteration, not the original base GUI.
- `revised-38c49ce.png`: revision `38c49ce7d4f7bc1855a74c4a713d3b3c5e8fa3b5`,
  with the dependent list collapsed by default. It expands to show names/versions
  and is absent when no direct active dependents exist.

The initial section displaces the description by 132.5 CSS px including margin;
the revised closed disclosure uses 32 px including margin, saving 100.5 px.
Before this PR, the viewer showed only the description; active dependents were
already explained in the disabled-deactivation hover hint. No original-base
screenshot is included. Native keyboard/focus and Windows scaling acceptance
remain unverified; consult the PR's current testing checklist.
