# GUI scaling and top-edge resize test

This combined preview contains PR #366 and PR #367 on top of current main.
It is a test of the planned v1.0.16 changes, not an official release. The footer
still shows the current base version, 1.0.15.

Extract the entire ZIP into a new folder, then run UCP3-GUI.exe from that folder.
The title reads "UCP3 GUI TEST - Scaling + Top Resize (PR 366 + 367)".
Keep the backgrounds, gameinfo and lang folders alongside the executable.
No installation is needed. The preview has separate GUI settings and webview
storage, and automatic updates are disabled.

## Readability

1. Hold Ctrl and scroll up once: content should become 110% size. Repeat to
   reach 150% (five steps) and 200% (ten steps). Scrolling down reduces it in
   10% steps. The bounds are 100% and 200%.
2. Try Ctrl+Plus/Minus and Ctrl+0 (reset to 100%). Ordinary scrolling should
   still scroll content normally.
3. Open Credits or Troubleshooting and check that text, controls and dialogs
   scale together. Optional: browse to a test game folder, open AI Swapper,
   and check Ctrl+scroll and Ctrl+0 from inside the custom menu.
4. Close the preview at 150% and reopen it: it should remember 150%.
5. At 200% in a small window, use the outer scrollbars to reach the footer.

## Window resizing

1. At 100%, in an unmaximized window, drag the very top edge (the first 5 pixels)
   up/down. Its height should change while the bottom edge stays in place.
2. Repeat near the upper-left and upper-right corners; both dimensions should
   change. Repeat at 150% and 200%.
3. Drag the titlebar below that narrow strip: the whole window should move.
   Double-click the titlebar to maximize/restore. Check minimize and close too.
4. When maximized, the top strip should not interfere with the titlebar controls.

You do not need to install a framework, apply customizations or launch the game
for the basic checks. Selecting a game folder gives this GUI its normal access
to that folder, so use a disposable copy for the optional custom-menu check.

Please report: scaling PASS/FAIL, top/corner resizing PASS/FAIL, and any trouble
at 150%/200%. Both PRs remain unmerged pending your confirmation.
