# iOS acceptance — Lancet & Linen v1.3.0

The game targets **landscape first**. Portrait is intentionally not a cramped
play mode: it shows the bilingual rotation prompt until enough horizontal space
is available. Safari and Chrome on iOS both use WebKit, but their browser bars,
PWA installation behaviour and restoration timing still warrant separate
physical-device checks.

## Simulator evidence (2026-07-22)

Tested on an iPhone 17 Pro simulator running iOS 26.4 in Safari against the
local development build.

- Portrait shows the rotation screen, with no clipped canvas or playable
  controls beneath it.
- Landscape fills the usable Safari view and reaches the compact main menu.
- New Journey opens the origin carousel, four-name grid and Begin action.
- Begin reaches the large dialogue card without overlapping the browser UI.
- The DEV-only `?testPreset=city-agreement` route reaches the Augsburg city
  agreement as its only active game scene. One tap spends the visible 20 coin,
  disables the action, and keeps the written reason visible.
- The URL preset waits for the Preload-to-menu hand-off and is stripped from
  production builds. Loading a preset itself is in-memory only; ordinary game
  actions performed afterwards retain their usual local-save behaviour.

## Required physical iPhone pass

Perform this on one current iPhone in **Safari** and **Chrome iOS** before a
store or public build. Test at least once with browser bars expanded and once
after they retract.

1. Open the deployed HTTPS build in portrait, verify the rotation prompt, then
   rotate to landscape.
2. Start a new game, choose each origin carousel direction once, select a name
   and reach the first dialogue. Confirm every action is at least 44 CSS pixels
   and no text is cut off by the notch or browser bars.
3. Reach Hub → More → City agreements. In Augsburg, complete the cloth letter,
   secure the linen agreement, leave and return; confirm the price benefit is
   Augsburg-only. In Nürnberg, confirm the inspection's council reduction does
   not enable the guild elder office.
4. Exercise a disabled action with touch and, if a keyboard is attached, focus,
   Enter and number key. It must not activate and its reason must remain
   readable.
5. Background the browser, return, rotate twice, and use the compact-mode and
   text-scale settings. The canvas must refit and the active scene must retain
   usable controls.
6. On Safari and Chrome iOS separately, save, reload, export and import a v1.3
   save. Confirm the city agreements survive and old saves migrate without
   losing coin, correspondence or household data.

Record device model, iOS version, browser version, viewport orientation, and
any browser-bar/PWA difference with screenshots for release sign-off.
