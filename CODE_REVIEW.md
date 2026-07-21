# Code review — 2026-07-21

A pass over the whole project looking for the defect classes that have actually
occurred here, rather than for style. Every check was run as a command and its
output is what is reported below.

## What was checked, and what it found

| Check | Result |
|---|---|
| Technique ids referenced but never defined | **clean** |
| i18n keys used in code but missing from a locale | **clean** |
| Keys present in one locale only | **clean** |
| Scenes defined but never registered in `Game.ts` | **clean** |
| Duplicate scene keys | **clean** |
| Recipe ingredients that are not real inventory fields | **clean** |
| Assets referenced by the preloader but not on disk | **clean** |
| Assets on disk that nothing loads | **clean** |
| `setInterval` without a matching `clearInterval` | **clean** |
| Exported functions with no caller | **17 found** — see below |

## The one real defect

**`resetView` in `ui/pinch.ts` was never called.** Written in the same session
that added pinch-zoom, and not wired to anything — so a player who zoomed in on
a phone had no way back to the fit view.

This is the defect class this project keeps producing, and it is worth naming
plainly because it has now happened five times:

- `staffSkillBonus` computed a value treatment never read
- the `dynasty` ending was mathematically unreachable
- `goreVariantKey` had no call site and no `_low` strings existed
- `incomeMult` was defined and never used
- two origins granted technique ids that do not exist

None of these fail a type check, and none are visible in review — the code
reads correctly in isolation. They only appear when you ask *"does anything
call this?"* and *"can this state be reached?"*. That question is now part of
this document and should be re-run before each release.

Fixed by binding it to a two-finger double tap, with the hint text updated so
the gesture is discoverable.

## The 17 unused exports

Deliberately left. They do not lie to the player — they are simply unused, and
removing them is a separate decision from fixing behaviour:

`isGranted`, `tryBuyBathhouse`, `screenHelpKey`, `describeRepEffects`,
`isPersistent`, `resetStorageForTests`, `learnTechniqueFromBook`,
`portraitKeyForPatientClass`, `addVignette`, `transitionRestart`,
`dustParticles`, `contentWidth`, `columnWidth`, `rowsThatFit`,
`isMentorTaught`, `humorColor` — and `resetView`, now wired.

Two are worth a second look eventually: `learnTechniqueFromBook` duplicates
`unlockTechnique` with no book item anywhere in the game, and
`portraitKeyForPatientClass` is superseded by `portraitKeyForPatient`.
Duplicated paths are how the earlier double-charge bug happened.

## False positives worth recording

So the next pass does not chase them again:

- **"Listeners without cleanup"** in `HubScene`, `TravelScene`, `slider.ts`,
  `mobile.ts`. All are either `GameObject` listeners — Phaser destroys those
  with the object — or one-time DOM guards installed at boot. Not leaks.
- **"Adjacent interpolations"** as a lint rule was written and then removed;
  see the comment in `tests/labels.test.ts`. It could not distinguish
  `${n >= 0 ? '+' : ''}${n}` (correct) from a genuine defect.

## Test coverage

247 tests across 20 files. The suites that matter most are the ones that check
*reachability and integrity* rather than logic, because those catch the defect
class above:

- `achievements.test.ts` — every achievement is unlockable by some state
- `origins.test.ts` — granted technique ids exist; no origin dominates another
- `recipes.test.ts` — targeted categories exist; no recipe consumes without producing
- `lexicon.test.ts` — every entry has text in both locales
- `tracks.test.ts` — every music file exists and its licence is documented
- `labels.test.ts` — lint rules for unreadable UI strings

## Re-running this

```bash
# dead exports
for f in src/game/systems/*.ts src/game/ui/*.ts src/game/data/*.ts; do
  grep -oP '^export (async )?function \K\w+' "$f" | while read -r fn; do
    n=$(grep -rn "\b$fn\b" src/ tests/ --include=*.ts | grep -v "^$f:.*export" | wc -l)
    [ "$n" -eq 0 ] && echo "$fn ($f)"
  done
done
```

The asset, i18n and id cross-checks are all short Python one-offs; the shapes
are in the git history of this file's commit.
