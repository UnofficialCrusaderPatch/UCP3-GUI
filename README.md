# PR #384 screenshots

Matched Chromium screenshots for https://github.com/UnofficialCrusaderPatch/UCP3-GUI/pull/384.

- Before: `601e9480740ab5e946ea32f9738f0ae6ccd4fe60`
- After: `6ba339263257ab48cf1b5ff86f70b578888c356f`
- The focused fixture loads the exact source CSS, Bootstrap form styles, River Avenue font and existing chain, hook and merge-order arrow assets.
- The plain background, wrapper layout, magnification and persistent native stepper visibility are fixture presentation. These are not full launcher screenshots.
- Identical values, input dimensions and top/middle/bottom scroll positions in both captures.

Fresh checks:

- Native upper/lower mouse targets and keyboard Up/Down: 3000 -> 3001 -> 3000, with trusted input events.
- Non-default step: 120 -> 125 -> 120 with step=5.
- Max/min mouse checks remain at 1000 and 0. Disabled and read-only controls produce no input events.
- The 240px and 128px input dimensions remain unchanged.
- CSS formatting, git diff --check and the full npm run vite-build pass.

The automation click API does not send mousemove; each arrow check starts with fresh focus so the native spin button recalculates its upper/lower target. No input handlers were added to the app.

The screenshots live on this dedicated evidence branch.
