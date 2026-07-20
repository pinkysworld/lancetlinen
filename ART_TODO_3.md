# Art round 3 — resolution parity and Steam store

**Status (2026-07-20): Priority 1–3 done.** Steam capsules still deferred.

The game renders into a **1920×1080** drawing buffer (world coords still 1280×720;
see `RENDER_SCALE` in `src/game/types.ts`). All main backgrounds are now **1920×1080**.

---

## Done — Priority 1 (aspect-ratio bugs)

| File | Was | Now |
|------|-----|-----|
| `bg_church.jpg` | 864×1152 portrait (cropped) | **1920×1080** Gothic nave landscape |
| `bg_road.jpg` | 1152×864 (4:3) | **1920×1080** muddy woodland road |
| `bg_rival.jpg` | 1152×864 (4:3) | **1920×1080** rival shop front at dusk |

## Done — Priority 2 (former 720p set → 1080p)

Enhanced from existing art (image-edit for coherence) then saved at **1920×1080**:

`bath_bg` · `menu_bg` · `map_bg` · `home_bg` · `bg_nurnberg` · `bg_market` ·
`bg_monastery` · `bg_warcamp` · `bg_guild` · `bg_plague` · `bg_festival` ·
`bg_wedding` · `bg_noble_house`

`map_bg` kept light/uncluttered for travel UI.

## Done — Priority 3 (magenta fringing)

Re-keyed with fringe despeckle:

- `logo_title.png`
- `ui_frame_portrait.png`
- all `icon_*.png`

No purple halo against dark UI.

---

## Deferred — Steam store assets

Not generated yet (submission-time only). Dimensions still need verification against
current Steamworks docs. **Do not fabricate screenshots.**

| Asset | Size (verify) |
|-------|----------------|
| Header capsule | 460×215 |
| Small capsule | 231×87 |
| Main capsule | 616×353 |
| Vertical capsule | 374×448 |
| Page background | 1438×810 |
| Library capsule | 600×900 |
| Library hero | 3840×1240 |
| Library logo | 1280×720 transparent |

## Optional — WebP

Still recommended once you are happy with 1080p looks:

```bash
cd public/assets
for f in *.jpg; do cwebp -q 82 "$f" -o "${f%.jpg}.webp"; done
```

Then swap extensions in `ART_CORE` / `ART_DEFERRED` in `PreloadScene.ts`.
