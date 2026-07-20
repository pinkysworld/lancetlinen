# Lancet & Linen — Early Access plan

Working document for the Steam store page and the EA submission. Everything
below should be true at the point of writing; where it is not yet true it is
marked **TODO**.

---

## Store positioning

Lead with the specificity. There is no shortage of medieval management games and
no shortage of surgery games; there is very little that is *about* the actual
social position of a barber-surgeon in the Holy Roman Empire in 1382.

**The pitch:** You are a Bader. You cut hair, pull teeth, set bones, bleed the
sick and run a bathhouse. You are also, in the eyes of your town, not quite an
honest man — and no amount of money will fully fix that.

**What actually differentiates it:**

- The honour axis (*Unehrlichkeit*) is the spine, not flavour text. It gates the
  guild, marriage and civic office, and **it cannot be maxed** — the ceiling is
  set below "respected" because the question was not settled until the
  Reichspolizeiordnung of 1548. The historical dead end is the design.
- Galenic humoral medicine played straight. You diagnose by pulse and
  observation into a *candidate set*, not a correct answer, and treat according
  to period theory. The game never tells you which technique is right.
- Real places, real dates, real prices. See `HISTORY_AUDIT.md` for what is
  sourced and what is still approximated.

**Do not** lead with "surgery simulator" or "roguelike". Both set the wrong
expectation and neither is what the game is.

---

## Why Early Access

Honest version, which is also the version that belongs on the store page:

A full run is roughly **3–5 hours** to an ending. That is a credible Early
Access game and a poor full-price one. The systems are in and the loop holds up;
what is thin is *content volume* — scenarios, dialogue, and the number of
distinct things that can happen to you in a given week.

Steam's refund window is two hours. A player who refunds at 1h59m should have
seen enough to know whether they want the rest. That means Act 1 has to be
strong, and the honour axis has to be legible early rather than a late-game
reveal.

---

## What's in (EA launch)

- Full campaign to five endings, gated on 35 patients treated
- Humoral diagnosis with pulse-reading, belief narrowing, and no answer key
- Honour system gating guild, marriage, and civic office
- Late-game pressure: church scrutiny escalating to interdict, debt called in
  with property seizure
- Bathhouse, staff, family, politics, property, and travel across 7 cities
- 29 techniques, ~20 mentor offers, advanced techniques gated behind travel
- Three difficulty settings (Merciful / Fair / Harsh)
- Autosave plus three manual save slots
- Full German and English localisation
- Accessibility: text scaling, colour-blind-safe signalling, reduced motion,
  reduced particles, gore level, remappable keys
- Codex with historical sources

## What's coming

Ordered by what the audit says is most missing, not by what is easiest.

1. **More Act 3 content.** The back half of a run is the thinnest part. More
   scenarios gated past the campaign midpoint, and more that fire on the
   honourable path specifically.
2. **A second interaction type.** Everything routes through one timing check.
   Setting a bone, pulling a tooth and bleeding a patient should not feel
   identical.
3. **Deeper staff and family.** Both are currently closer to menus than systems —
   they can be maxed and then forgotten.
4. **More cities**, and reasons to return to ones you have left.
5. **Steam Deck support.** Not targeted for EA launch; the UI is desktop-first.
6. **An in-game achievement list**, so the set is visible off Steam too.

## What EA feedback should decide

- Whether the honour ceiling feels like a statement or like a cap
- Whether difficulty settings are the right three
- Whether the diagnosis loop is *readable* — the failure mode is "opaque", not
  "hard"

---

## Technical checklist before submission

| Item | Status |
| --- | --- |
| Desktop build without ad hooks (`npm run build:desktop`) | done — `ADS_ENABLED` is false when `VITE_DESKTOP` is set, so the calls drop from the bundle |
| Electron packaging (`npm run electron:build`) | done |
| Saves in `userData`, atomic write-then-rename | done |
| Save slots | done — autosave + 3 manual |
| Achievements defined and wired | done — 10, evaluated at day end |
| `steamworks.js` bridge | done — optional dependency, degrades to no-op |
| **Real Steam App ID** | **TODO** — `electron/steam.cjs` defaults to 480 (Valve's Spacewar test appid). Must be replaced, and achievements re-created in the Steamworks partner site with matching API names. |
| Steam Cloud | **TODO** — use **Auto-Cloud** pointed at `saves.json` in `userData`; no code needed. Do not hand-roll the Cloud API for a file this small. |
| Store capsule art (all sizes) | **TODO** — see `ART_WORK.md` |
| Trailer | **TODO** |
| Age rating questionnaire | **TODO** — the game depicts bloodletting and surgical failure; gore level is adjustable but the default is not the low setting |

### Achievement API names

These are **permanent** once published. `tests/achievements.test.ts` guards the
format and reachability; it does not guard against a rename, so treat the list
in `src/game/systems/achievements.ts` as frozen after first publish.

`FIRST_BLOOD`, `HUNDRED_HANDS`, `TOLERATED`, `AS_HONEST_AS_ALLOWED`,
`CLEAN_HANDS`, `RICH_AND_INFAMOUS`, `GUILD_BROTHER`, `COUNCIL_SEAT`,
`PLAGUE_YEAR`, `THE_LINE_CONTINUES`.

Four are hidden, because they name story outcomes.

---

## Notes on the Steam integration

`steamworks.js` (v0.4.0, Aug 2024) rather than `greenworks` (last published
2022, does not build against current Electron). It is an **optional**
dependency and is lazily required inside a try/catch, so three cases all work:

- browser build — never loads the Electron main process at all
- local `npm run electron:dev` with no Steam client running
- a DRM-free build for itch.io

In each of those `steam.init()` returns false, `available()` resolves false, and
every achievement call is a silent no-op. Nothing in the game branches on
whether Steam is present.
