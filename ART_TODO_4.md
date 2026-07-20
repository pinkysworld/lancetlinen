# Art round 4 — the wordmark, and the Steam store set

**Status (2026-07-20):** Priority 1 done — `logo_title.png` has real blackletter
"L"s (reads *Lancet & Linen*), true RGBA transparency, no magenta fringe, and
remains readable when scaled to 231×87. Priority 2 (Steam capsules) still waits
for submission day.

Two jobs. The first is a real defect found in play-testing and should be done
first; the second is needed on submission day, not before.

Sizes, house style and the suggested capsule composition are **already written
up in `ART_WORK.md`** — this file does not repeat them. Read that first.

---

## Priority 1 — `logo_title.png` is not legible

This is the highest-value art fix in the project right now: it is the first
thing anyone sees, and it is also the asset that has to survive being shrunk to
a 231×87 search-result thumbnail.

Three separate problems in the current file:

### 1. Both "L"s are missing as letters

The design substitutes an object for each initial — a lancet for the "L" of
*Lancet*, a folded linen cloth for the "L" of *Linen*. Neither reads as a
letter. On screen the title reads:

> **ancet & inen**

The objects sit *beside* the words rather than forming them. This is not a
scaling or cropping problem — it was diagnosed at three different sizes and in
the source PNG.

**Fix:** draw both "L"s as actual letters in the same blackletter hand as the
rest. The lancet and the linen can stay as decorative elements — leaning
against the letter, threaded behind it, forming a flourish off its foot — but
the letterform has to be present and complete on its own. If a reader covering
up the objects cannot still read *Lancet & Linen*, it is not done.

### 2. Magenta fringing on the transparency

Pink/magenta edges on the linen cloth and throughout the red vine ornament.
This is the same defect `ART_TODO_3.md` records as fixed for the portraits
("re-keyed with fringe despeckle") — the logo was missed.

**Fix:** re-key the alpha with fringe despeckle, or regenerate on a dark ground
and cut out cleanly. Check the result against a **light** background as well as
the dark menu, because that is where coloured fringing shows worst — and the
Steam library and store pages are not dark.

### 3. Blackletter that closes up at small sizes

Textura makes `m` / `n` / `u` / `i` nearly identical, and the interior
counters fill in as soon as the image is scaled down. Legible in the menu at
440 px wide; not legible at 231 px.

**Fix:** open the counters, widen the spacing slightly, and reduce the ornament
density inside the letterforms. Test by exporting at **231 px wide** and
reading it cold.

### Deliverable

`logo_title.png` — transparent PNG, 1280×720 or larger, no magenta fringe,
both "L"s present as letters, legible when downscaled to 231 px wide.

The same corrected wordmark is then reused for the Steam **Library logo**
asset, so getting it right here does double duty.

---

## Priority 2 — Steam store capsules

Not needed until submission. See `ART_WORK.md` for the full size table, the
suggested composition and the house-style suffix; the notes below are only the
things that are easy to get wrong.

- **Verify every dimension against current Steamworks documentation before
  generating.** The sizes in `ART_WORK.md` are from memory and Valve changes
  them. Wrong dimensions are a rejected submission.
- **Small capsule (231×87)** — no pictorial detail survives at this size. It is
  the wordmark and almost nothing else. Do not crop the header down to it.
- **Library capsule (600×900)** is portrait. It needs its own composition, not
  a rotated or cropped header.
- **Library hero (3840×1240)** is extremely wide and the store overlays the
  centre. Put the subject well off to one side.
- **Page background (1438×810)** sits under heavy UI. Atmospheric and nearly
  empty is correct; anything busy will fight the page.
- **Do not generate the screenshots.** Valve requires genuine gameplay
  captures, and generated ones are grounds for rejection.

Keep the upper third of the header and main capsules clear — that is where the
title sits.

---

## Not needed

Stated so it does not get generated speculatively:

- More backgrounds. There are 73 assets covering every screen.
- More patient portraits. Every class has variants.
- Icons. The set is complete and consistent.

The remaining gap in this project is **content and systems**, not art — see
`EARLY_ACCESS.md` for what actually needs building.
