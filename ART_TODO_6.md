# Art round 6 — the people the story talks to, and the council chamber

**Status (2026-07-21): Done.**

| Key | File | Size |
|---|---|---|
| `port_gregor` | `public/assets/port_gregor.webp` | 1024² (matches house set; TODO said 512) |
| `port_ortlieb` | `public/assets/port_ortlieb.webp` | 1024² |
| `port_guard` | `public/assets/port_guard.webp` | 1024² |
| `bg_council` | `public/assets/bg_council.webp` | 1920×1080 |
| `bg_lazar` | `public/assets/bg_lazar.webp` | 1920×1080 |

JPG masters: `_asset_backup_jpg/round6/`. Already in `ART_DEFERRED` /
`portraitKeyForNpc` / `LepraschauScene` / scenarios — no code change needed.

Steam capsules listed under P2 were **already shipped** in `ART_TODO_4` at
**current** Steamworks sizes under `store/steam/` (not the obsolete
460×215 / 231×87 numbers below).

Note on that path: the capsules live in `store/steam/`, *outside* `public/`,
which is correct — store art must not ship in the web build. Earlier drafts of
both TODOs said `public/assets/steam/`, which does not exist; corrected here
rather than by moving the files.

Style reference for everything here: the existing portraits
(`port_berthold.webp`, `port_krafft.webp`, `port_origin_*.webp`) — late-medieval
oil-painting look, warm candlelit palette, dark neutral background, head and
shoulders, subject lit from one side. Same framing and size as the existing
files: **portraits 1024×1024** (set standard), **backgrounds 1920×1080**,
saved as `.webp` into `public/assets/`.

## Why this round

The dialogue system has seven speakers and only three of them have faces.
Until now Father Gregor — a Cistercian monk — was shown with a woman's
portrait, and the guard, the captain and councilman Ortlieb all shared the
merchant's face. The code now asks for the keys below and falls back to
stand-ins of the right sex until the files exist, so these can be added in any
order and the game keeps working.

## Priority 1 — three NPC portraits and one background

### `port_gregor.webp` (512×512)
Father Gregor, Cistercian infirmarian of Ebrach, around sixty. White habit
with black scapular (Cistercian, not Benedictine black), tonsure, weathered
kind face, candlelight from the left. He tends the sick and has seen
everything; the look is patient, not stern. No blood, no tools — canon law
forbade him the knife, which is a plot point.

### `port_ortlieb.webp` (512×512)
Councilman Ortlieb of Nürnberg, fifties, patrician. Dark fur-trimmed robe
(Schaube), heavy chain of office, flat black cap. Well-fed, shrewd, the face
of a man who grants bath licences and remembers favours. Slight warm light
from a window, interior stone behind.

### `port_guard.webp` (512×512)
A Nürnberg town guard doubling as the captain: forties, mail coif pushed back
off the brow, padded gambeson with the city's colours hinted (red/white),
short beard, broken nose. Tired competence, not menace. Serves both the
`npc.guard` and `npc.captain` speakers.

### `bg_council.webp` (1920×1080)
The council chamber where the Lepraschau is held. A long dark oak table, two
councilmen seated in half-shadow at its far end, tall leaded windows with late
light, candles on iron stands, the city's seal on the wall. Mood: a room where
words become law. Leave the centre-bottom third calm — the UI panel sits
there.

## Priority 2 — one background, five capsules

### `bg_lazar.webp` (1920×1080)
The lazar house outside the walls: a low timber building beyond the town gate,
autumn light, a bell on a post (lepers carried bells), the city wall receding
behind. Melancholy, not horror. Used by the "the man you cleared comes back"
scenario.

### Steam capsules — superseded by ART_TODO_4 ✅

Do **not** regenerate to the sizes below; they are obsolete. Live set:

`store/steam/` — header 920×430, small 462×174, main 1232×706,
vertical 748×896, library 600×900, hero 3840×1240, page bg 1438×810,
library logo 1280×720. See `ART_TODO_4.md` / `ART_WORK.md`.

## After generating

1. Drop the files into `public/assets/`.
2. The texture keys are already wired: `port_gregor`, `port_ortlieb`,
   `port_guard`, `bg_council`, `bg_lazar` are in `ART_DEFERRED`
   (PreloadScene.ts) and every consumer guards with `textures.exists`.
3. Nothing else to do — no code changes needed when the art lands.
