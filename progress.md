Original prompt: Implement the approved "Mobiler Kernloop & Funktionssicherheit" plan for Lancet & Linen.

## 2026-07-21 — implementation started

- Baseline is clean: TypeScript, 510 unit tests, and production build passed before changes.
- First delivery target: compact-size primitives plus the menu, character creation, dialogue, and day-summary layouts.
- Browser evidence from the audit: the existing compact main menu works, but character creation, dialogue, and the day summary were still desktop layouts at 844×390.
- No new visual assets are needed. Keep portrait orientation as a rotate prompt.

## 2026-07-21 — completed implementation and checks

- Compact controls now derive from a 44 CSS-pixel floor, including iPad landscape FIT scaling.
- Main menu and Hub are paginated; character origin, dialogue, day ledger, and treatment all have dedicated compact flows.
- Treatment is three short pages: examination, fee/intensity plus moon/vein choice, then a three-technique pager.
- Fullscreen is Settings-only, feature-detected, and rejection-safe. The old first-tap fullscreen path has been removed.
- Added a DEV-only `render_game_to_text()` control/state bridge and deterministic `advanceTime(ms)` for browser testing.
- Added focused logic coverage for events, family, guidance, journal, queue, requirements, and save export/import.
- Browser screenshots checked 844×320, 844×390, 932×430, and 1180×820 landscape. Core controls reported at least 44 CSS pixels.
- Hardened button event cleanup after the browser audit found an old scene could be destroyed before its pointer-up cleanup completed; a fresh touch run produced no browser errors.
- Final validation: `npx tsc --noEmit`, `npm test` (521 tests), `npm run build`, and `git diff --check` passed. The build remains 511.28 kB gzip and retains the existing chunk-size warning.

## 2026-07-21 — v1.1.0 foundation

- Package and Vite release metadata now use v1.1.0; saved metadata records the app version while save schema migrates to v3.
- Fixed the desktop and compact Lombard layout by giving the emergency loan a dedicated row; treatment findings now begin below the portrait frame and measured status text.
- Disabled gated actions are now defended in both button registries and callbacks. Debt repayment has an explicit unavailable reason below the inactive control.
- Added the local `playwright` dev dependency for reproducible E2E work. Its canvas exporter is black in this WebGL environment even in headed mode, so browser visuals must also be checked through the in-app browser screenshots; text-state artifacts remain valid.
- Checks: `npx tsc --noEmit` and `npm test` (521 tests) passed.

## 2026-07-21 — v1.1.0 history, household, Manual and browser pass

- Added stored Act-3 consequences, staff traits/events, spouse household focus, story-gated birth assistance, and the Nürnberg council/sworn-craft rule.
- Added the twelve-chapter Manual, a 60-entry bilingual Lexicon with evidence/source markers, the source bibliography, and the Grok Build v1.1 asset brief.
- Added deterministic DEV presets (`hub-broke`, treatment, debt, household and regimen states) to `render_game_to_text` / `advanceTime` testing.
- Fixed Safari viewport recovery: Phaser now rebuilds its backing width when visual-viewport dimensions settle after rotation or browser-bar changes.
- Browser checked touch-mode 844×320 main menu, Manual and Lexicon list/article. Canvas fills 844×320, 844×390 and 932×430 after boot; iPad-landscape remains safely FIT-scaled without clipping.
- Final validation passed: `npx tsc --noEmit`, `npm test` (532 tests), `npm run build`, and `git diff --check`. The production bundle is 528.23 kB gzip; its size warning remains the explicitly deferred performance follow-up.
- Final touch-mode review at 844×320 confirmed the full-width Lexicon article, its evidence/source marker, and readable Back control. The in-app browser session was then reset and closed.

## 2026-07-22 — Grok v1.1 art integration verified

- Grok's four 2048×1152 scene backgrounds, nine 768×1024 staff/family portraits, and three four-frame WebP ambience loops are present, preloaded, and wired into the relevant treatment, household, debt, council, staff, and family surfaces.
- The three loops run at 3 fps, have a frame-one static fallback, and honour the existing reduced-particles setting.
- Static visual inspection found deliberate blank/dark space for UI text in each new background. Automated validation remains green: `npx tsc --noEmit`, `npm test` (532), `npm run build`, and `git diff --check`.
- The external Playwright game client cannot resolve the workspace-local Playwright package from its skill directory; its generated canvas capture is additionally black in this WebGL environment. Use the existing DEV text bridge plus in-app/physical-device visual acceptance for the final UI pass.

## 2026-07-22 — v1.2.0 historical houses & correspondence

- Added a save-safe schema-v4 contacts system: neutral relations migrate deterministically, and one paid correspondence may be in flight at a time.
- The three time-gated routes are deliberately 1382-plausible exchanges rather than anachronistic dynasty roles: Augsburg weaving, Florentine account letters, and a courier network toward Tabriz. Their returns resolve on a later day with visible journal consequences.
- Added a full-width compact correspondence screen, a Hub entry, `correspondence-active` DEV preset, and text-bridge state for repeatable browser checks.
- The Manual, bilingual Lexicon and bibliography now document the chronologies and sources; the Lexicon has 64 entries.
- Final validation: `npx tsc --noEmit`, `npm test` (535 tests), `npm run build`, `git diff --check` all pass. Production build confirms the DEV test bridge is absent. The bundle is 534.62 kB gzip and retains the deferred chunk-size warning.

## 2026-07-22 — v1.3 performance and city consequences (in progress)

- Rolldown now emits cacheable `phaser` and `i18n` chunks. The game-content chunk fell to 163.68 kB gzip; Phaser is a separate 357.84 kB gzip runtime chunk.
- Added schema-v5 city agreements: a returned Augsburg cloth letter can lead to a local linen agreement, and a Nürnberg council inspection makes the city-specific sworn-craft rule mechanically consequential. Both are one-time, journalled, visible and save-migrated.
- Unit and migration coverage is green at 538 tests. The bundled external game-client still cannot resolve Playwright from its skill directory; rerun is recorded as an environment limitation while simulator/in-app checks remain required.
- Safari on iPhone 17 Pro / iOS 26.4 Simulator passed portrait rotation prompt, landscape main menu, origin carousel, dialogue and the local Augsburg city-agreement tap/disabled-reason flow. The URL preset initially raced Preload and layered on the menu; it now waits for MainMenu and replaces every active non-Preload scene. Evidence and the remaining real-device Safari/Chrome checklist live in `docs/IOS_ACCEPTANCE.md`.
- Final v1.3 checks: `npx tsc --noEmit`, `npm test` (538 tests), `npm run build`, production DEV-bridge absence and `git diff --check` pass. Final split: entry 1.80 kB gzip; shell 6.33 kB; management 8.91 kB; gameplay 152.29 kB; i18n 13.47 kB; Phaser 357.84 kB. The external skill-owned Playwright client still fails before launch because Node resolves packages from the skill directory, not this workspace; simulator screenshots and unit checks are the validated local evidence. Physical Safari and Chrome iOS sign-off remains the explicit release gate in `docs/IOS_ACCEPTANCE.md`.

## 2026-07-22 — v1.3.1 readability and family pacing (in progress)

- Added a start-menu Release Notes scene (current and preceding release), plus `docs/RELEASE_NOTES.md` and a v1.3.1 package/version update.
- Hub summary, guidance and work rows now use an explicit measured vertical band; courtship and spouse gifts now have local, once-per-day pacing fields that migrate from schema v5 to v6.
- The Family scene now maps each named spouse to a stable portrait instead of changing their appearance with household focus.
- `npx tsc --noEmit` and the targeted migration/family/portrait/release-note tests pass (30 tests). The required skill-owned Playwright client was run against the local Vite server and again fails before launch: Node resolves `playwright` from the skill directory rather than this workspace. No screenshot was produced by that client; use the in-app browser/simulator route for visual evidence.
- In-app browser verification at 844×320 confirmed the start-menu **What’s new** button, both release-note pages and no new console warnings/errors. The `act3-household` preset confirmed that switching Anna from household to trade changes only the focus text/effect after art is ready; her portrait stays unchanged. The browser viewport override was reset and its temporary tab closed.
- Final validation passed: `npx tsc --noEmit`, `npm test` (544 tests), `npm run build`, production DEV-bridge absence, and `git diff --check`. Current cacheable output: entry 1.81 kB gzip; shell 6.70 kB; management 8.91 kB; gameplay 153.43 kB; i18n 13.47 kB; Phaser 357.84 kB.

## 2026-07-22 — Grok cinematic delivery (in progress)

- Imported the six approved 1280×720 stills as deferred cinematic scene alternatives: market, bathhouse, sickroom, Nürnberg council, household and road.
- Imported the two completed 6.04-second H.264/24-fps clips to `public/trailer/`; they are documented and deliberately not preloaded or auto-played, pending a complete representative Steam trailer edit.
- TypeScript and focused cinematic/portrait tests pass (17 tests). The skill-owned external browser client remains unavailable because it resolves `playwright` from the skill directory; in-app browser checks show the sickroom, household and road cinematics at runtime with no console warnings or errors.

## 2026-07-22 — audio reliability and score variation (in progress)

- Audited all shipped music files: every original and four new CC0 sources decode as 44.1 kHz stereo MP3. The perceived hum came from the intentionally procedural dialogue/night/danger/war fallback themes, not corrupt source files.
- Added four curated CC0 tracks for festival, travel arrival, serious danger and war camp. Kept ordinary dialogue and night deliberately sparse so text remains readable; the 1597 Dowland render was not included because it falls outside the 1382 setting.
- Recorded tracks now retry after the first successful user-gesture unlock and fall back to their procedural theme if the browser reports a media error, rather than becoming permanently silent. The skill-owned Playwright client was run and remains blocked by its own package-resolution issue; the in-app browser’s bloodletting path completed with no console warnings/errors.

## 2026-07-22 — treatment header and outcome cleanup (in progress)

- The procedure list now reserves half of the *actual* button height plus a 12px gutter below its measured hint/warning text. This fixes the touch-layout bug where a row's centre was positioned after the warning but its upper half still covered it.
- The four-frame bath-steam loop remains available on the treatment workbench, but is explicitly hidden before rendering the treatment outcome so it cannot float as an apparent video tile over the result card.
- Targeted layout tests pass. In-app browser verification ran the full bloodletting → skill check → outcome flow: the astrology warning clears the list and the result card has no loop overlay or console warnings. The required external game client was also rerun and remains blocked before launch because it resolves Playwright from the skill directory rather than the workspace.

## 2026-07-22 — progression calibration

- Local standing no longer receives a second, generic outcome increment after the multi-facet reputation system has already applied its result. Positive local standing now tapers after the first 30 points; losses remain fully consequential.
- "Living legend" moves from 75 to 90 local standing. A strong 35-patient main-story career remains below it, while the test curve reaches it only through a long, successful 140-patient career.
- Stored technique XP now grants a small per-technique mastery benefit at 60 / 160 / 320 XP (maximum +4 percentage points). It is visible as `Übung` / `Practice` in the treatment list and cannot replace examination, supplies, risk, or the timing check.
- Focused progression checks pass (11 tests); final `npm test` (554), `npx tsc --noEmit`, `npm run build` and `git diff --check` pass. The required skill-owned Playwright client was rerun and remains blocked before launch because it resolves `playwright` from the skill directory instead of the workspace. In-app browser review of the treatment preset shows a clear, non-overlapping treatment list and no console warnings.
