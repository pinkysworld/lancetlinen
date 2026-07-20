# Art work — outstanding

**Short version: the game does not need much more art.** 73 assets, all
backgrounds at 1920×1080, portrait variants across every patient class. What
was still making screens look unfinished turned out to be *code*, not missing
files, and that has now been fixed (see the last section).

Only one item is genuinely required before release, and it is not needed until
submission day.

---

## Required before Steam submission

Valve rejects submissions with wrong dimensions, so **verify each size against
the current Steamworks documentation** before generating — these are from
memory and Valve does change them.

| Asset | Size (verify) | Notes |
|---|---|---|
| Header capsule | 460×215 | The one everyone sees. Title must read as a thumbnail |
| Small capsule | 231×87 | Search results — logo only; art detail is invisible at this size |
| Main capsule | 616×353 | Front-page features |
| Vertical capsule | 374×448 | Seasonal sales |
| Page background | 1438×810 | Heavily overlaid — keep it atmospheric and near-empty |
| Library capsule | 600×900 | Portrait format; needs its own composition, not a crop of the header |
| Library hero | 3840×1240 | Very wide — the subject must sit off-centre |
| Library logo | 1280×720 | Transparent PNG, logo only |

**Suggested capsule composition** — one image, reused across the set with
different crops:

> A barber-surgeon mid-treatment by candlelight, lancet catching the light, the
> patient's face turned away in shadow, brass basin and bloodied linen in the
> foreground, a copper boiler steaming behind. Dark, warm, high contrast, with
> the upper third kept clear for the title.

Plus the house style suffix:

> Oil painting on panel, Northern Renaissance / Dutch Golden Age technique,
> warm candle-lit palette of umber, ochre, deep red and muted gold, visible
> brushwork, soft chiaroscuro, aged varnish. No text, no lettering, no
> watermark, no modern objects.

**Do not generate the screenshots.** Steam requires real gameplay captures
(5+ at 1920×1080). Fabricating them breaks Valve's rules and players spot it
immediately. Capture them from the running game once the build is final.

---

## Optional — diminishing returns

Only worth doing if you have budget spare. None of these are blocking.

- **More patient portraits.** Coverage is now peasant ×4, artisan ×3, soldier ×3,
  merchant/noble/clergy/beggar ×2. The thinnest are `clergy` and `noble`, which
  the player meets often in the late game. Two more of each would help; the
  naming convention `port_<class><n>.jpg` picks them up automatically with no
  code change.
- **`bg_crossroads.jpg`** — the only settlement type with no dedicated art.
  Currently falls back to `bg_road`, which is close enough that most players
  will never notice.
- **Per-technique skill-check backdrops** beyond `art_pulse` and `art_dental` —
  e.g. one for bathing and one for wound work. Cosmetic.

---

## If the API is failing

I could not test it — there is still no `XAI_API_KEY` in the environment or in
`.env` / `.env.local`, so `npm run art` exits before making a request. Two
things worth checking before assuming the key is at fault:

1. **The model name.** `tools/generate-art.mjs` defaults to
   `grok-imagine-image-quality`. If that id is wrong or has been renamed, every
   call fails identically regardless of the key. Try the cheaper model to
   isolate it:
   ```bash
   XAI_IMAGE_MODEL=grok-imagine-image npm run art -- --prompt "test" --out /tmp/t.jpg
   ```
2. **Print the actual error.** The script surfaces the API's own response body
   on failure — a bad key, a bad model id and an out-of-credit account produce
   three different messages, so the text matters. Paste it and I can tell you
   which it is.

The generation targets in this file are written so they can be pasted into
whatever tool works, not only that CLI.

---

## What was actually wrong — fixed in code, no art needed

Worth recording, because it explains why several screens looked unfinished
despite the art existing:

- **Every conversation in the game showed a procedural gradient.** `DialogueScene`
  drew the texture key `bath_bg` — which is a crude canvas gradient generated at
  boot, *not* the painted bathhouse (that is `art_bath`). Dialogue now uses the
  current location's painting, so conversations feel situated.
- **Four scenes bypassed `sceneBackground`** — Market, Property, Mentors and
  Scenario each drew their art raw at `alpha 0.4` under a black rectangle,
  stretched with `setDisplaySize` and so distorted. All now cover-fit with a
  vignette.
- **The six management backdrops were invisible.** `addManagementBackground`
  stacked `alpha 0.38` under a `0.42` black rectangle — roughly 22% of the
  painting survived.
- **Deferred art never retried.** Most backgrounds and portraits stream in after
  the menu appears; reaching a screen before its texture arrived left it blank
  *permanently*, because the `textures.exists()` guard was checked once. Both
  `sceneBackground` and `addPortrait` now redraw when the texture lands.

---

## Also still worth doing

Convert `public/assets` to WebP — it is 24 MB and every file is now 1080p:

```bash
cd public/assets
for f in *.jpg; do cwebp -q 82 "$f" -o "${f%.jpg}.webp"; done
```

Then swap the extensions in `ART_CORE` / `ART_DEFERRED` in
`src/game/scenes/PreloadScene.ts`. Keep the `.jpg` files until you have
confirmed the WebP versions look right. This matters much more for the web
build than for Steam, where the assets ship locally.
