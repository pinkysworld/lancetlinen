# Tools

## `generate-art.mjs` — xAI Grok Imagine (for Claude / agents)

Generate or edit Lancet & Linen art **without** Grok Build chat image tools.

### 1. API key (required — Claude cannot invent this)

1. Create a key at [console.x.ai](https://console.x.ai/)
2. In the project root:

```bash
cp .env.example .env.local
# edit .env.local and replace xai-your-key-here with your real key
```

Or export in the shell:

```bash
export XAI_API_KEY=xai-...
```

3. Verify (no network call that spends money — only checks the key is present):

```bash
npm run art:check
```

Expected: `✓ XAI_API_KEY loaded (xai-…xxxx)`

If Claude sees “No XAI_API_KEY”, **stop art generation** and tell the human to add the key.

### 2. Commands Claude should use

**Background (16:9, game style):**

```bash
node tools/generate-art.mjs \
  --prompt "Wide landscape muddy Franconian road under grey sky, wayside shrine…" \
  --out public/assets/bg_road.jpg \
  --aspect 16:9 --resolution 2k --style --force
```

**Portrait (1:1):**

```bash
node tools/generate-art.mjs \
  --prompt "Medieval peasant woman head and shoulders, linen coif, dark studio…" \
  --out public/assets/port_peasant5.jpg \
  --aspect 1:1 --resolution 2k --style --force
```

**Edit existing asset (keep composition):**

```bash
node tools/generate-art.mjs \
  --edit public/assets/bg_nurnberg.jpg \
  --prompt "Same composition, higher detail, richer dusk light" \
  --out public/assets/bg_nurnberg.jpg --force
```

**List named presets:**

```bash
node tools/generate-art.mjs --list
```

### 3. After generating

1. Register new files in `src/game/scenes/PreloadScene.ts` (`ART_CORE` or `ART_DEFERRED`).
2. Wire keys in `src/game/ui/art.ts` if location/portrait pools need them.
3. Hard-refresh the game.

### 4. Transparency (icons / logo)

The API returns **opaque** images. For PNG with alpha:

1. Prompt: `… on a flat uniform magenta (#FF00FF) background`
2. Key out:

```bash
magick in.jpg -fuzz 12% -transparent '#FF00FF' -despeckle out.png
```

### 5. Docs

- Image generation: https://docs.x.ai/developers/model-capabilities/images/generation  
- Image editing: https://docs.x.ai/developers/model-capabilities/images/editing  

### 6. Note for Claude

Do **not** invent other image APIs for this project unless the user asks. Prefer:

```text
XAI_API_KEY set → node tools/generate-art.mjs --prompt "…" --out public/assets/….jpg --aspect … --style --force
```
