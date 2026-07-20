# Art to generate in Grok

Status: **done** (2026-07-20) — all five primary gaps filled and wired.

---

## Done checklist

| File | Status | Wired into |
|------|--------|------------|
| `ui_icons.png` + 9× `icon_*.png` | ✅ | Preload core, Market rows, Hub HUD (coin/rep/ethics) |
| `ui_parchment.jpg` | ✅ | `parchmentPanel()` grain overlay |
| `logo_title.png` | ✅ | Main menu (text fallback if missing) |
| `ui_frame_portrait.png` | ✅ | `addPortrait()` carved frame |
| `art_pulse.jpg` | ✅ | Skill-check backdrop (blood/wound arts) |
| `art_dental.jpg` | ✅ | Skill-check backdrop (dental/oral arts) |

Style used: oil painting on panel, Northern Renaissance / Dutch Golden Age,
warm candle-lit umber–ochre–deep red–muted gold. Magenta-keyed PNGs for
transparency (logo, icons, frame).

**Logo note:** initials of “Lancet” and “Linen” are illustrated as a physical
lancet and folded linen (correct spelling, decorative blackletter body).

---

## Optional follow-ups

### Convert existing JPEGs to WebP

`public/assets/` is still multi‑MB. WebP would cut size ~60–70%:

```bash
cd public/assets
for f in *.jpg; do cwebp -q 82 "$f" -o "${f%.jpg}.webp"; done
```

Then swap extensions in `ART_CORE` / `ART_DEFERRED` in
`src/game/scenes/PreloadScene.ts`. Keep `.jpg` until WebP is confirmed.

### Extra polish (not required)

- `icon_ironTools` for market iron tools row
- Per-city hub BGs beyond Nürnberg reuse
- Animated steam particles on bath BG
