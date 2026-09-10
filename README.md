# PR #377 screenshot evidence

Review-only images for [UCP3-GUI PR #377](https://github.com/UnofficialCrusaderPatch/UCP3-GUI/pull/377).
This independent evidence branch is not part of the application PR or distribution.

## Current two-way dependency trees (`b9924f3`)

The user supplied these two captures from the local `.review/previews.html`
page on 10 September 2026. They are preserved unchanged:

- `current-collapsed-b9924f3.png`: default closed disclosure at the top-right.
- `current-expanded-b9924f3.png`: outgoing requirements and active incoming
  dependents shown in two columns.

The page imports the actual component and styles at application revision
`b9924f3c78152890877bee8326f31907d17f3e09`, with fixture extension data and mocked
host I/O. Each iframe renders at 1024 x 768 and is scaled to fit; the supplied
images are cropped views, not full viewport captures. They are not native Tauri
or in-game screenshots and do not establish keyboard/scaling acceptance.

To reproduce, copy the three files from `current-harness/` into `.review/` in
an isolated checkout of that application revision, install its existing
dependencies, start the frontend dev server and open `/.review/previews.html`.
The expanded fixture opens the actual disclosure through its native toggle.
No fixture files or screenshots belong in the application package.

## Historical iterations

The two historical screenshots were captured at 1024 x 768 in a browser fixture importing the
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
