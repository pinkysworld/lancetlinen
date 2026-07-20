# Art round 2 — toward a shippable, Steam-quality build

**Status (2026-07-20): Tier 1 + Tier 2 generated and wired.**  
Tier 3 (Steam store capsules) deferred until resolution / submission planning.

---

## Done — Tier 1a Patient portraits

| File | Description |
|------|-------------|
| `port_peasant2.jpg` | Middle-aged peasant woman, coif |
| `port_peasant3.jpg` | Gaunt young peasant man |
| `port_peasant4.jpg` | Elderly woman, clouded eye |
| `port_artisan2.jpg` | Dyer woman, stained apron |
| `port_artisan3.jpg` | Carpenter with sawdust |
| `port_merchant2.jpg` | Merchant woman, fur collar |
| `port_soldier2.jpg` | Scarred mercenary woman, short hair |
| `port_soldier3.jpg` | Young levy with helm |
| `port_clergy2.jpg` | Stern nun |
| `port_noble2.jpg` | Patrician woman, headdress |
| `port_beggar1.jpg` | Ragged beggar man, bandaged arm |
| `port_beggar2.jpg` | Beggar woman with infant |

**Wiring:** `pickPortraitKey()` + class pools in `ui/art.ts`; assigned at patient generation in `treatment.ts`. Stable per `uid`.

---

## Done — Tier 1b City backgrounds

| File | City |
|------|------|
| `bg_bamberg.jpg` | Cathedral on river at dusk |
| `bg_wurzburg.jpg` | Fortress, vineyards, stone bridge |
| `bg_augsburg.jpg` | Merchant square, fountain, carts |
| `bg_rothenburg.jpg` | Half-timbered lane + gate tower |

**Wiring:** `bgKeyForLocation()` maps each id to its own texture (no more Nürnberg reuse).

---

## Done — Tier 2 Management screens

| File | Screen |
|------|--------|
| `bg_journal.jpg` | Scribe desk / ledger |
| `bg_staff.jpg` | Bathhouse back room |
| `bg_family.jpg` | Household hearth + cradle |
| `bg_politics.jpg` | Council chamber |
| `bg_mentors.jpg` | Surgeon study |
| `bg_settings.jpg` | Plain workshop corner |
| `icon_ironTools.png` | Crossed lancet + pliers (transparent) |

**Wiring:** `addManagementBackground()` on Journal / Staff / Family / Politics / Settings; Mentors scene uses `bg_mentors`; Market uses `icon_ironTools`.

---

## Deferred — Tier 3 Steam store

Not generated (as recommended in the original brief): capsules depend on final resolution and branding pass. Screenshots must be real gameplay.

---

## Notes

- Sources generated at model default sizes; installed portraits at **1536×1536**, backgrounds at **1920×1080** (good intermediate until canvas resolution bump).
- Style: Northern Renaissance oil / candle-lit umber–ochre–gold set, matching round 1.
- Remaining product work (empty states partly fixed for Mentors; 1280×720 canvas; WebP) is still code/infra, not more art.
