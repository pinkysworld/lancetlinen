# Lancet & Linen v1.1 — Grok Build art brief

**Status (2026-07-22): Delivered and wired.**

| Set | Files | Notes |
|---|---|---|
| Backgrounds | `bg_*_v11.webp` ×4 | 2048×1152 |
| Staff portraits | `portrait_staff_*_v11.webp` ×5 | 768×1024 |
| Family portraits | `portrait_family_*_v11.webp` ×4 | 768×1024 |
| Ambient loops | `loop_{hearth,bath_steam,fumigation}/frame-0{1–4}.webp` | 1024×576 |

Wired: `PreloadScene` deferred load; Staff/Family portraits; Family →
`bg_household_v11`; Politics+debt → `bg_lombard_v11`; Lepraschau →
`bg_council_v11`; Treatment → `bg_sickroom_v11`; `playAmbientLoop` (3 fps,
respects `reduceParticles`). Masters: `_asset_backup_jpg/v1.1/`.

Use this brief directly with Grok Build/Imagen. Deliver **WebP**, no embedded
letters, labels, UI, logos, watermarks or borders. Preserve the existing
painted late-medieval visual language: warm umber, muted oxblood, soot black,
parchment highlights, realistic but lightly romanticised 1380s southern German
town life. Leave calm, darker areas for game UI.

## Delivery contract

- Still backgrounds: `2048×1152` WebP, landscape, 16:9-safe central subject with 10% crop tolerance.
- Portraits: `768×1024` WebP, vertical, face and shoulders centred, opaque background.
- Loops: four still WebP frames each, `1024×576`, named `frame-01.webp` through `frame-04.webp`; no video files.
- Store under `public/assets/` using the names below. The game must retain a static fallback if any asset is absent.
- Never depict modern instruments, electrical light, printed signs, medical diagrams, captions, text or UI.

## Four backgrounds

1. `bg_council_v11.webp` — **Ratsstube**: oak chamber, daylight from high leaded windows, a long table with wax seals and rolled parchment, two councillors in the distance. Empty darker lower-left and lower-centre space for controls; no readable writing.
2. `bg_lombard_v11.webp` — **Lombard lender**: covered arcade near a market, locked chest, balance scales, folded cloth and a seated lender shown without caricature. Keep the centre calm and dark enough for buttons; money has no readable markings.
3. `bg_household_v11.webp` — **Household at dusk**: modest but secure urban room, folded linen, small hearth, wooden chest, two figures in quiet domestic work. Reserve upper-right for status text and lower third for actions.
4. `bg_sickroom_v11.webp` — **Sickroom**: simple shuttered chamber, bed, basin, folded linen, a caregiver in soft silhouette. The patient is not graphically injured; reserve left third for portrait/status and lower half for treatment controls.

## Five staff portraits

`portrait_staff_apprentice_v11.webp`, `portrait_staff_bathmaid_v11.webp`,
`portrait_staff_manager_v11.webp`, `portrait_staff_herbboy_v11.webp`,
`portrait_staff_nightwatch_v11.webp`.

Show one historically plausible adult or older teen where appropriate, direct
three-quarter portrait, working clothing, neutral background variation, calm
expression. Avoid stereotypes, exaggerated filth, modern gender coding and
weapons except a modest staff or lantern for the nightwatch.

## Four family portraits

`portrait_family_home_v11.webp`, `portrait_family_trade_v11.webp`,
`portrait_family_kin_v11.webp`, `portrait_family_elder_v11.webp`.

Show a household partner or older relative in a domestic or market-adjacent
setting. The images represent social priorities, not fixed gender roles. Keep
hands and props simple, no letters or account pages with readable text.

## Optional four-frame ambient loops

1. `loop_hearth/frame-01.webp` … `frame-04.webp` — tiny flame shift in a hearth; all else still.
2. `loop_bath_steam/frame-01.webp` … `frame-04.webp` — slow steam drift above a bath; no nudity or UI.
3. `loop_fumigation/frame-01.webp` … `frame-04.webp` — sparse incense smoke curl in a room; no claim that it heals.

Animate at 3 fps in Phaser only when the existing **reduce particles** setting
is off. On reduced-motion or missing-frame conditions, show frame 01 as a
static image. Do not ship video; moving footage remains reserved for a future
Steam trailer.
