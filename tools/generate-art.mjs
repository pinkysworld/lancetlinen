#!/usr/bin/env node
/**
 * Generate or edit game art via the **xAI Grok Imagine** API.
 *
 * Designed so Claude (or any agent) can run it without Grok Build chat tools.
 *
 * Setup:
 *   1. Get a key at https://console.x.ai/
 *   2. export XAI_API_KEY=xai-...
 *      # or put it in .env / .env.local at the project root
 *
 * Usage:
 *   # Named targets (style auto-appended)
 *   node tools/generate-art.mjs --list
 *   node tools/generate-art.mjs bg_bamberg
 *   node tools/generate-art.mjs --all --force
 *
 *   # Freeform prompt (what Claude should use for new assets)
 *   node tools/generate-art.mjs --prompt "A medieval bathhouse interior…" \
 *     --out public/assets/bg_example.jpg --aspect 16:9 --resolution 2k
 *
 *   # Portrait / icon (1:1)
 *   node tools/generate-art.mjs --prompt "…" --out public/assets/port_foo.jpg --aspect 1:1
 *
 *   # Edit an existing file (image-to-image)
 *   node tools/generate-art.mjs --edit public/assets/bg_nurnberg.jpg \
 *     --prompt "Same scene, higher detail, dusk light" \
 *     --out public/assets/bg_nurnberg.jpg --force
 *
 *   # Cheaper / faster model
 *   XAI_IMAGE_MODEL=grok-imagine-image node tools/generate-art.mjs --prompt "…" --out /tmp/t.jpg
 *
 * Docs: https://docs.x.ai/developers/model-capabilities/images/generation
 *       https://docs.x.ai/developers/model-capabilities/images/editing
 */
import { writeFile, mkdir, access, readFile } from 'node:fs/promises';
import { dirname, join, resolve, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'assets');

const API_GEN = 'https://api.x.ai/v1/images/generations';
const API_EDIT = 'https://api.x.ai/v1/images/edits';

/** Default quality model. Override with XAI_IMAGE_MODEL. */
const DEFAULT_MODEL = 'grok-imagine-image-quality';
/** Cheaper: grok-imagine-image */

/** Appended when --style (default on for named targets; off unless --style for freeform). */
const STYLE =
  'Oil painting on panel, Northern Renaissance / Dutch Golden Age technique, ' +
  'warm candle-lit palette of umber, ochre, deep red and muted gold, visible ' +
  'brushwork, soft chiaroscuro, aged varnish. No text, no lettering, no ' +
  'watermark, no modern objects.';

/**
 * Named targets: filename stem → prompt body (STYLE is always appended).
 * Add new rows when you invent assets; also register keys in PreloadScene.ts.
 */
const TARGETS = {
  // Examples / leftovers — already shipped assets skip unless --force
  bg_bamberg:
    'A medieval German cathedral town on a river at dusk, timbered houses climbing the hill toward a stone cathedral, market boats moored at the quay. Wide 16:9 landscape.',
  bg_wurzburg:
    'A medieval German wine town beneath a hilltop fortress, vineyards on the slopes, a stone bridge over a wide river in late afternoon light. Wide 16:9 landscape.',
  bg_augsburg:
    'A prosperous medieval German merchant city square, tall guild houses with painted facades, a stone fountain, well-dressed traders. Wide 16:9 landscape.',
  bg_rothenburg:
    'A small walled medieval German town at golden hour, half-timbered houses along a narrow cobbled lane, a gate tower at the end of the street. Wide 16:9 landscape.',
};

// ─── .env loader (no dependency) ─────────────────────────────
async function loadEnvFiles() {
  for (const name of ['.env.local', '.env']) {
    const p = join(ROOT, name);
    try {
      const text = await readFile(p, 'utf8');
      for (const line of text.split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const eq = t.indexOf('=');
        if (eq < 1) continue;
        const k = t.slice(0, eq).trim();
        let v = t.slice(eq + 1).trim();
        if (
          (v.startsWith('"') && v.endsWith('"')) ||
          (v.startsWith("'") && v.endsWith("'"))
        ) {
          v = v.slice(1, -1);
        }
        if (process.env[k] === undefined) process.env[k] = v;
      }
    } catch {
      /* missing is fine */
    }
  }
}

function apiKey() {
  const key = process.env.XAI_API_KEY?.trim();
  if (!key) {
    throw new Error(
      'XAI_API_KEY is not set.\n' +
        '  export XAI_API_KEY=xai-...\n' +
        '  # or add XAI_API_KEY=xai-... to .env / .env.local in the project root\n' +
        '  Get a key: https://console.x.ai/',
    );
  }
  return key;
}

function model() {
  return process.env.XAI_IMAGE_MODEL?.trim() || DEFAULT_MODEL;
}

function parseArgs(argv) {
  const out = {
    names: [],
    all: false,
    force: false,
    list: false,
    help: false,
    check: false,
    style: null, // null = default behaviour
    prompt: null,
    out: null,
    edit: null,
    aspect: null,
    resolution: null, // '1k' | '2k'
    n: 1,
    noStyle: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--all') out.all = true;
    else if (a === '--force' || a === '-f') out.force = true;
    else if (a === '--list' || a === '-l') out.list = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else if (a === '--check') out.check = true;
    else if (a === '--style') out.style = true;
    else if (a === '--no-style') out.noStyle = true;
    else if (a === '--prompt' || a === '-p') out.prompt = argv[++i];
    else if (a === '--out' || a === '-o') out.out = argv[++i];
    else if (a === '--edit' || a === '-e') out.edit = argv[++i];
    else if (a === '--aspect' || a === '-a') out.aspect = argv[++i];
    else if (a === '--resolution' || a === '-r') out.resolution = argv[++i];
    else if (a === '--n') out.n = Math.max(1, Math.min(10, Number(argv[++i]) || 1));
    else if (a === '--model') process.env.XAI_IMAGE_MODEL = argv[++i];
    else if (!a.startsWith('-')) out.names.push(a);
    else throw new Error(`Unknown flag: ${a}`);
  }
  return out;
}

function usage() {
  return `xAI Grok Imagine — game art generator

Usage:
  node tools/generate-art.mjs --list
  node tools/generate-art.mjs <target> [<target>...] [--force]
  node tools/generate-art.mjs --all [--force]
  node tools/generate-art.mjs --prompt "…" --out public/assets/name.jpg [options]
  node tools/generate-art.mjs --edit path/to/src.jpg --prompt "…" --out dest.jpg [--force]

Options:
  --prompt, -p      Freeform text prompt
  --out, -o         Output path (default: public/assets/<name>.jpg)
  --edit, -e        Source image to edit (local path or https URL)
  --aspect, -a      1:1 | 16:9 | 9:16 | 4:3 | 3:4 | 3:2 | 2:3 | auto | …
  --resolution, -r  1k | 2k  (default: API default, usually 1k)
  --n               Number of images 1–10 (default 1; only first saved to --out)
  --style           Force-append Lancet & Linen oil style suffix
  --no-style        Never append style (default for freeform --prompt)
  --model           Override model (or env XAI_IMAGE_MODEL)
  --force, -f       Overwrite existing files
  --list, -l        List named targets
  --check           Verify XAI_API_KEY is loaded (no API call)
  --help, -h

Env:
  XAI_API_KEY         Required (console.x.ai → .env.local)
  XAI_IMAGE_MODEL     Default: grok-imagine-image-quality
                      Cheaper: grok-imagine-image

Examples for Claude:
  export XAI_API_KEY=xai-...
  node tools/generate-art.mjs --prompt "Medieval peasant woman portrait, head and shoulders…" \\
    --out public/assets/port_peasant5.jpg --aspect 1:1 --resolution 2k --style
  node tools/generate-art.mjs --prompt "Wide Gothic church nave…" \\
    --out public/assets/bg_church.jpg --aspect 16:9 --force --style
`;
}

async function exists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

function mimeFromPath(p) {
  const e = extname(p).toLowerCase();
  if (e === '.png') return 'image/png';
  if (e === '.webp') return 'image/webp';
  return 'image/jpeg';
}

async function loadImageAsDataUrl(pathOrUrl) {
  if (/^https?:\/\//i.test(pathOrUrl)) {
    return { url: pathOrUrl, type: 'image_url' };
  }
  const abs = resolve(pathOrUrl);
  const buf = await readFile(abs);
  const mime = mimeFromPath(abs);
  return {
    url: `data:${mime};base64,${buf.toString('base64')}`,
    type: 'image_url',
  };
}

async function downloadUrl(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${res.status}: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

/**
 * Call xAI images/generations or images/edits.
 * Returns Buffer of the first image.
 */
async function callImagine({ prompt, editPath, aspect, resolution, n }) {
  const key = apiKey();
  const m = model();
  const isEdit = Boolean(editPath);
  const endpoint = isEdit ? API_EDIT : API_GEN;

  const body = {
    model: m,
    prompt,
    n: n ?? 1,
    response_format: 'b64_json',
  };
  if (aspect) body.aspect_ratio = aspect;
  if (resolution) body.resolution = resolution;

  if (isEdit) {
    body.image = await loadImageAsDataUrl(editPath);
    // Single-image edit keeps source aspect; still pass aspect if multi-ref later
  }

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}\n${await res.text()}`);
  }

  const json = await res.json();
  const item = json?.data?.[0];
  if (!item) {
    throw new Error(`Empty response: ${JSON.stringify(json).slice(0, 500)}`);
  }

  if (item.b64_json) {
    return Buffer.from(item.b64_json, 'base64');
  }
  if (item.url) {
    return downloadUrl(item.url);
  }
  throw new Error(`No b64_json or url in response: ${JSON.stringify(item).slice(0, 400)}`);
}

async function writeOut(buf, outPath) {
  const abs = resolve(outPath);
  await mkdir(dirname(abs), { recursive: true });
  await writeFile(abs, buf);
  return abs;
}

function withStyle(prompt, { useStyle }) {
  if (!useStyle) return prompt;
  if (prompt.includes('Northern Renaissance')) return prompt;
  return `${prompt.trim()} ${STYLE}`;
}

async function generateNamed(name, { force, aspect, resolution }) {
  const promptBody = TARGETS[name];
  if (!promptBody) throw new Error(`Unknown target "${name}". Use --list.`);

  const outPath = join(OUT_DIR, `${name}.jpg`);
  if (!force && (await exists(outPath))) {
    console.log(`· ${name}: exists (use --force)`);
    return null;
  }

  const prompt = withStyle(promptBody, { useStyle: true });
  const ar = aspect ?? (name.startsWith('port_') || name.startsWith('icon_') ? '1:1' : '16:9');
  console.log(`… ${name}  model=${model()}  aspect=${ar}`);
  const buf = await callImagine({
    prompt,
    aspect: ar,
    resolution: resolution ?? '2k',
    n: 1,
  });
  const file = await writeOut(buf, outPath);
  console.log(`✓ ${name} → ${file}`);
  return file;
}

async function generateFreeform(opts) {
  const { prompt, out, edit, force, aspect, resolution, n, noStyle, style } = opts;
  if (!prompt) throw new Error('--prompt is required for freeform generation');
  if (!out) throw new Error('--out is required for freeform generation');

  const abs = resolve(out);
  if (!force && (await exists(abs))) {
    console.log(`· ${basename(abs)}: exists (use --force)`);
    return null;
  }

  // Freeform: style only if --style
  const useStyle = style === true && !noStyle;
  const full = withStyle(prompt, { useStyle });
  const ar = aspect ?? (edit ? undefined : '16:9');

  console.log(
    `… freeform  model=${model()}` +
      (ar ? `  aspect=${ar}` : '') +
      (resolution ? `  res=${resolution}` : '') +
      (edit ? `  edit=${edit}` : ''),
  );

  const buf = await callImagine({
    prompt: full,
    editPath: edit,
    aspect: ar,
    resolution,
    n,
  });
  const file = await writeOut(buf, abs);
  console.log(`✓ → ${file}`);
  return file;
}

async function main() {
  await loadEnvFiles();
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    console.log(usage());
    return;
  }

  if (args.check) {
    const key = process.env.XAI_API_KEY?.trim();
    if (!key) {
      console.error(
        '✗ No XAI_API_KEY found.\n' +
          '  1. Open https://console.x.ai/ and create an API key\n' +
          '  2. cp .env.example .env.local\n' +
          '  3. Put the key in .env.local as: XAI_API_KEY=xai-...\n' +
          '  4. Re-run: npm run art:check\n' +
          '\n' +
          'FLAG FOR HUMAN: Claude cannot generate art until this key exists.',
      );
      process.exit(1);
    }
    const masked =
      key.length <= 12 ? '(too short — check the value)' : `${key.slice(0, 7)}…${key.slice(-4)}`;
    console.log(`✓ XAI_API_KEY loaded (${masked})`);
    console.log(`  model default: ${model()}`);
    console.log(`  assets dir:    ${OUT_DIR}`);
    return;
  }

  if (args.list || (!args.prompt && !args.names.length && !args.all && !args.edit)) {
    console.log('Named targets:');
    for (const k of Object.keys(TARGETS)) console.log(`  ${k}`);
    console.log('\n' + usage());
    return;
  }

  // Freeform / edit path
  if (args.prompt || args.edit) {
    if (!args.prompt) throw new Error('--edit requires --prompt describing the change');
    await generateFreeform({
      prompt: args.prompt,
      out: args.out ?? join(OUT_DIR, `gen-${Date.now()}.jpg`),
      edit: args.edit,
      force: args.force,
      aspect: args.aspect,
      resolution: args.resolution,
      n: args.n,
      noStyle: args.noStyle,
      style: args.style,
    });
  } else {
    const names = args.all ? Object.keys(TARGETS) : args.names;
    for (const name of names) {
      try {
        await generateNamed(name, {
          force: args.force,
          aspect: args.aspect,
          resolution: args.resolution,
        });
      } catch (err) {
        console.error(`✗ ${name}: ${err.message}`);
        process.exitCode = 1;
      }
    }
  }

  console.log(
    '\nIf this is a new asset, register it in ART_CORE / ART_DEFERRED in\n' +
      'src/game/scenes/PreloadScene.ts — the game does not auto-load by filename.',
  );
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
