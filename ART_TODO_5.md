# Art round 5 — origin portraits, and the wordmark

**Read `ART_TODO_4.md` first.** It is still unstarted and its Priority 1 (the
logo) outranks everything here. This file adds what the character-creation
rewrite needs, plus the two backgrounds a full audit found genuinely missing.

House style, capsule sizes and the standing "no text, no watermark" suffix are
in `ART_WORK.md`. Not repeated here.

---

## What the audit actually found

I checked every scene in `src/game/scenes/` for whether it draws a painting or
just the procedural gradient. Five were bare:

| Scene | Fixed how |
|---|---|
| `NameEntryScene` | now uses `art_menu` — **but see Priority 1 below** |
| `CityEventScene` | reused `bg_market` |
| `StudyScene` | reused `bg_monastery` |
| `UpgradesScene` | reused `art_bath` |
| `TravelResultScene` | reused `bg_road` |

Four of the five needed **no new art at all** — they were code defects, not
missing files. That is the same finding as the last two rounds, and it is worth
saying plainly: **the game is not short of art.** 73 assets cover every screen.
Generate only what is listed below.

---

## Priority 1 — Six origin portraits

Character creation now opens on a choice of origin, each with its own stats,
purse, standing and starting techniques (`src/game/data/origins.ts`). Every one
is historically attested. Right now they borrow existing portraits as
stand-ins, which works but is visibly approximate — the Feldscher is wearing a
soldier's bandage, the widow is somebody else's grandmother.

**Format:** square, 1024×1024, head-and-shoulders, transparent or plain dark
ground. They are drawn at 92 px in a gold frame, so the face must read *small*.
Keep the head large in frame and the background almost empty.

**Shared style:** oil on panel, Northern Renaissance, warm candle-lit palette of
umber, ochre and muted gold, visible brushwork, soft chiaroscuro, aged varnish.
These are portraits of working people in 1382 — no armour polish, no heroism,
no modern dentistry.

| Key | Character | Brief |
|---|---|---|
| `port_origin_bader_son` | Bader's Son | A man in his late twenties, plain linen shirt open at the neck, damp hair from the steam room. Capable, unremarkable, slightly wary. He has done this work since he could carry a bucket. |
| `port_origin_field_surgeon` | Feldscher | Weathered man of forty, an old scar through one eyebrow, leather apron over a soldier's gambeson. Not brutal — *tired*. He has seen more torn bodies than anyone in the town and it shows around the eyes. |
| `port_origin_monastery_scholar` | Monastery Scholar | Tonsured man, thirties, undyed wool habit, soft unmarked hands, ink on two fingers. Intelligent and entirely untested by physical work. |
| `port_origin_journeyman` | Wandering Journeyman | Man in his early twenties, sunburnt, dusty travelling cloak, a friendly and quick expression. Looks like he has just walked in from the road, because he has. |
| `port_origin_bath_widow` | Bather's Widow | Woman of forty-five in widow's headcloth, dark plain dress, composed and unyielding. She is holding the bathhouse against the guild and knows it. Dignity, not sorrow. |
| `port_origin_executioner_kin` | Executioner's Kin | The hardest brief. Late twenties, plain dark clothing, deliberately unremarkable — this is someone who avoids being looked at. Steady hands resting in view. **Not** a villain, not hooded, no axe, no menace. The point is that they are an ordinary skilled person the town refuses to touch. |

That last one matters. Scharfrichter families really were both the most
dishonourable people in a medieval city *and* sought-after bone-setters, because
the work taught them anatomy. The portrait should make the player feel the
injustice, not the threat. If it looks like a horror-game executioner it is
wrong.

## Priority 2 — Two backgrounds that would genuinely help

Both currently borrow a painting that is merely adjacent.

| Key | Size | Brief |
|---|---|---|
| `bg_study` | 1920×1080 | A Bader's own study, not a monastery library: a plain table by a shuttered window, a single bound book, loose notes, a candle, a mortar, an anatomical sketch pinned to the wall. Modest and cramped — this is a tradesman's room, not a scholar's. Currently borrows `bg_monastery`. |
| `bg_upgrades` | 1920×1080 | A bathhouse mid-alteration: a new copper boiler half-installed, fresh timber, tools on the floor, one tub still in use behind. Warm, busy, unfinished. Currently borrows `art_bath`, which shows a *finished* bathhouse and reads oddly on a build screen. |

Keep both dim and uncluttered in the centre. Dense UI text sits on top, and
`sceneBackground` darkens only the top and bottom bands.

---

## Explicitly not needed

Stated so it is not generated speculatively:

- **More patient portraits.** 25 exist, every class has variants.
- **More city backgrounds.** All seven cities are covered.
- **Icons.** The set is complete and consistent.
- **Screenshots for Steam.** Valve requires genuine gameplay captures; generated
  ones are grounds for rejection.

---

## After generating

New files must be registered in `src/game/scenes/PreloadScene.ts` — an unlisted
asset simply never loads and the screen falls back silently. Assets are now
**WebP** (`cwebp -q 82`, see `ART_WORK.md`); PNG only where transparency is
needed, which for this round means the six portraits if delivered cut out.
