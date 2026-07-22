# Lancet & Linen — Grok Build video brief

**Purpose:** short cinematic sequences for the Steam trailer, store page and
social clips. These are **not** gameplay assets and must not be embedded in the
browser build. The playable game continues to use the small, accessible WebP
loops described in `ART_WORK_V1.1.md`.

## Delivery contract

- Make six individual clips, **5–6 seconds each**, 16:9 landscape,
  1920×1080, 24 fps, H.264 MP4, no baked-in sound.
- Produce a matching, clean **first-frame PNG** for each clip. It doubles as
  thumbnail art and an editorial fallback.
- No title cards, subtitles, logos, watermarks, readable parchment, UI,
  modern type, modern medical equipment, electrical light, photographs or
  jump cuts.
- Motion should be restrained and physically plausible: a slow dolly, a
  single rack-focus, drifting steam, candle flame, fabric movement or passing
  people. Avoid rapid camera shakes, time-lapse, morphing faces and excessive
  particle effects.
- Keep all essential action in the centre 80% of the image so 16:9 crops and
  trailer captions remain safe.

## Shared visual direction — paste before every clip prompt

Late-medieval southern German city, Holy Roman Empire, around 1382; grounded
historical drama in the painted visual language of *Lancet & Linen*. Warm
umber wood, soot black, muted oxblood, tarnished brass, parchment highlights,
soft overcast daylight or honest firelight. Realistic materials and clothing,
human scale, calm dignity, lightly romanticised but never fantasy. The camera
is observant rather than heroic. Avoid plague-doctor masks, gothic-horror
exaggeration, magic, fantasy armour, ornate Renaissance palaces, modern
sanitation, modern surgery and graphic injury. No readable text anywhere.

Use the matching v1.1 background from `ART_WORK_V1.1.md` as a colour and
location reference when Grok Build supports a reference image; do not copy
existing UI, frames or lettering into the video.

## Clip 01 — `trailer_01_market_morning.mp4`

**Job:** opening image; establish a working city and the Bader’s modest place
within it.

**Prompt:**

> [Shared visual direction.] Dawn in a late-medieval Nürnberg market street.
> A modest Bader’s market stall is being opened: folded linen, a copper basin,
> a wooden stool and a handcart at the edge of frame. Townspeople begin to
> cross the wet cobbles in the background. Slow, deliberate forward dolly from
> street level toward the stall; thin chimney smoke moves, one horse passes at
> a walking pace. Reserve the upper centre as calm sky and roofline. No signs,
> no readable shop lettering, no spectacle.

**Camera / cut:** one unbroken 6-second forward move; end with the stall in
the lower-centre third.
**Negative prompt:** bustling modern market, readable signs, hyperactive crowd,
fantasy architecture, cinematic lens flare.

## Clip 02 — `trailer_02_bath_steam.mp4`

**Job:** show the bathhouse as a place of work and care, not a modern spa.

**Prompt:**

> [Shared visual direction.] Interior of a 1382 urban bathhouse before the
> day begins. A Bader in simple work clothes arranges folded linen beside a
> wooden tub while a bath attendant tends a small fire. Steam rises slowly
> from the water; warm firelight meets cool window light. Quiet side-to-side
> camera slide, beginning behind a wooden post and revealing the work area.
> Everybody remains fully and modestly clothed; the room is practical, worn
> and clean enough to be believable. No text, no nudity, no luxury spa mood.

**Camera / cut:** 5 seconds, gentle left-to-right slide, no cuts.
**Negative prompt:** modern bathroom, tiled spa, bare skin, sensual framing,
electric lamps, floating steam simulation.

## Clip 03 — `trailer_03_careful_treatment.mp4`

**Job:** communicate decision and restraint; no claim that a treatment cures.

**Prompt:**

> [Shared visual direction.] A quiet sickroom in a late-medieval German town.
> A Bader carefully examines a seated patient’s pulse while a caregiver holds
> a folded linen cloth and a clay basin rests nearby. The patient is alert and
> dignified; no wound is shown. Slow focus shift from the patient’s hand to
> the Bader’s thoughtful face, then settle. The scene suggests uncertainty,
> responsibility and period medicine rather than a triumphant cure.

**Camera / cut:** 5 seconds, locked tripod with one subtle rack focus.
**Negative prompt:** blood, surgery close-up, miracle recovery, modern
diagnostic equipment, plague mask, body horror.

## Clip 04 — `trailer_04_council_choice.mp4`

**Job:** represent reputation, debt and city consequences without UI.

**Prompt:**

> [Shared visual direction.] A restrained Nürnberg council chamber: oak table,
> wax seals, folded blank parchment and a brass balance scale. A councillor
> regards a standing Bader across the table while two other figures confer in
> soft background focus. The Bader sets down a small coin purse but keeps one
> hand on it, suggesting a difficult civic choice. Slow arc of the camera from
> behind the Bader’s shoulder toward the councillor. Faces remain natural and
> historically plausible; no caricature of lenders or officials.

**Camera / cut:** 6 seconds, one slow 15-degree arc.
**Negative prompt:** courtroom gavel, readable documents, stacks of gold,
villain lighting, modern banking, political banners.

## Clip 05 — `trailer_05_household_evening.mp4`

**Job:** show household continuity and partnership without implying that the
player’s spouse is a changing generic portrait.

**Prompt:**

> [Shared visual direction.] A modest, secure household at dusk. The same
> named partner is shown consistently throughout this take: an adult artisan
> in wool clothing folds linen by a hearth while the Bader returns from work
> and places a small market bundle on the table. A child’s wooden toy may sit
> on a shelf, but no child needs to appear. Slow static-camera push-in; hearth
> flame and hands move naturally. The mood is earned, domestic and practical,
> not sentimental fantasy.

**Camera / cut:** 5 seconds, minimal push-in.
**Negative prompt:** romance-novel posing, changing faces, aristocratic manor,
modern family home, written letters, melodrama.

## Clip 06 — `trailer_06_road_to_augsburg.mp4`

**Job:** finish on the wider world, learning and city-bound opportunity rather
than an implausible globe-trotting montage.

**Prompt:**

> [Shared visual direction.] Early morning on a maintained late-medieval road
> between Franconian towns. A small handcart and rider travel toward the distant
> walls of Augsburg; two cloth bales are tied securely to the cart. The Bader
> looks ahead, not at the camera. Start close on the cart wheel turning through
> shallow mud, then rise gently to reveal the road and city in the distance.
> Subtle wind moves a cloak and roadside grass. The journey feels costly and
> finite, never like exotic adventure tourism.

**Camera / cut:** 6 seconds, low wheel-level rise into a wide reveal.
**Negative prompt:** Asian travel montage, silk-road fantasy, mountains that
do not fit Franconia, galloping action, map overlays, modern roads.

## Editorial assembly suggestion

1. Market morning (1.5 s) → bath steam (1.5 s) → careful treatment (1.5 s).
2. Council choice (1.5 s) → household evening (1.5 s) → road reveal (2.0 s).
3. Add the game title, feature text, ratings and calls-to-action only during
   editing, never inside generated footage.

This provides a focused 9–10 second teaser. Keep full clips for a 30–45 second
Steam trailer, where real gameplay capture should occupy at least half of the
runtime so the trailer accurately represents the game.
