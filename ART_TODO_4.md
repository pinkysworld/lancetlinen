# Art round 4 — the wordmark, and the Steam store set

**Status (2026-07-20):** **Both priorities done.**

- **P1 wordmark** — `public/assets/logo_title.png` reads *Lancet & Linen* with
  real blackletter L’s, true RGBA transparency, no magenta fringe; also copied
  as `steam/library_logo.png` and `steam_library_logo.png`.
- **P2 Steam set** — `store/steam/` at **current Steamworks sizes**
  (verified 2026-07 against partner docs; older 460×215 / 231×87 / 616×353
  numbers in early drafts were wrong). Screenshots intentionally **not**
  generated (Valve requires real gameplay captures).

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

## Priority 2 — Steam store capsules ✅

Delivered under `store/steam/` (PNG + JPG). Manifest: `steam/README.md`.
Masters: `_asset_backup_jpg/steam_masters/`.

| Asset | Size (verified 2026-07) | File |
|---|---|---|
| Header capsule | **920×430** | `header_capsule.*` |
| Small capsule | **462×174** | `small_capsule.*` (wordmark fills) |
| Main capsule | **1232×706** | `main_capsule.*` |
| Vertical capsule | **748×896** | `vertical_capsule.*` |
| Page background | **1438×810** | `page_background.*` |
| Library capsule | **600×900** | `library_capsule.*` (own portrait plate) |
| Library hero | **3840×1240** | `library_hero.*` (**no text**) |
| Library logo | **1280×720** | `library_logo.png` (transparent) |
| Library header | **920×430** | `library_header_capsule.*` |

Wordmark is **composited** from `logo_title.png` (never re-generated as text).
Hero keeps subject left with empty center/right for client chrome.

**Still required for submission (not art):** 5+ real gameplay screenshots at
≥1920×1080. Do not invent them.

---

## Not needed

Stated so it does not get generated speculatively:

- More backgrounds. There are 73 assets covering every screen.
- More patient portraits. Every class has variants.
- Icons. The set is complete and consistent.

The remaining gap in this project is **content and systems**, not art — see
`EARLY_ACCESS.md` for what actually needs building.
