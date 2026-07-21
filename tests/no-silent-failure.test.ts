/**
 * A structural rule: an action that can refuse must never sit behind a plain
 * button.
 *
 * The individual bugs are fixed. This test is here so the *class* cannot come
 * back, because it came back repeatedly: twenty-two call sites across four
 * scenes each ran an action returning `boolean` and discarded it, and the
 * player experienced every one of them as a dead button.
 *
 * The rule, stated once:
 *
 *   A function in `systems/` that returns `boolean` and can refuse is a
 *   **gated action**. Every gated action needs a `can<Name>` companion, and
 *   every scene call must go through `gatedButton`, which owns the check and
 *   therefore cannot be forgotten.
 *
 * Adding a new gated action and wiring it to `makeButton` will fail here.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const SYS_DIR = join(process.cwd(), 'src/game/systems');
const SCENE_DIR = join(process.cwd(), 'src/game/scenes');

const sysFiles = readdirSync(SYS_DIR).filter((f) => f.endsWith('.ts'));
const sceneFiles = readdirSync(SCENE_DIR).filter((f) => f.endsWith('.ts'));

/**
 * Predicates and pure queries also return `boolean`; they are not actions and
 * need no gate. Listed by name rather than guessed from shape, so that adding
 * one is a deliberate act.
 */
const NOT_ACTIONS = new Set([
  // Predicates named `can…`/`is…`/`has…` are excluded by name in
  // `gatedActions()`; only genuine actions that need no gate go here.
  // A settings query that happens not to be named like one.
  'showBloodEffects',
  'consumeRemedy', // internal to applyTreatment, never a button
  'fireStaff', // dismissal always succeeds if the person exists
  'craftSalve', // RecipeScene has its own ingredient display
  'learnTechniqueFromBook',
  'unlockTechnique', // StudyScene prints price, skill and master-only itself
  // Its boolean answers "did anything change", not "did it succeed" — it is a
  // day-tick reconciler with no player-facing refusal to explain. Behind no
  // button at all: `endDay` and the hub call it.
  'syncQuests',
]);

/** Every `export function name(...): boolean` across the systems layer. */
function gatedActions(): Array<{ file: string; name: string }> {
  const out: Array<{ file: string; name: string }> = [];
  for (const f of sysFiles) {
    const src = readFileSync(join(SYS_DIR, f), 'utf8');
    for (const m of src.matchAll(/export function ([a-zA-Z]+)\([^)]*\)\s*:\s*boolean/gs)) {
      const name = m[1]!;
      if (NOT_ACTIONS.has(name)) continue;
      // A function already named `can…` *is* a check. Demanding a
      // `canCanBeCalledToLepraschau` for it is the rule misreading itself.
      if (/^(can|is|has|should)[A-Z]/.test(name)) continue;
      out.push({ file: f, name });
    }
  }
  return out;
}

describe('every gated action can be asked why', () => {
  const actions = gatedActions();

  it('finds actions to check, or this test is watching nothing', () => {
    expect(actions.length).toBeGreaterThan(10);
  });

  it('gives each one a can* companion', () => {
    const all = sysFiles.map((f) => readFileSync(join(SYS_DIR, f), 'utf8')).join('\n');
    const missing = actions.filter(({ name }) => {
      const cap = name[0]!.toUpperCase() + name.slice(1);
      // `canMarryNow` rather than `canMarry`, because `canMarry` was already
      // taken by the honour gate it delegates to.
      return !new RegExp(`export function can${cap}\\w*\\(`).test(all);
    });
    expect(missing.map((m) => `${m.file}:${m.name}`)).toEqual([]);
  });
});

describe('no gated action hides behind a plain button', () => {
  const actionNames = new Set(gatedActions().map((a) => a.name));

  /**
   * Split a scene into button calls, keeping which helper opened each one.
   * Crude but sufficient: we only need to know whether the nearest enclosing
   * button call was `makeButton` or `gatedButton`.
   */
  function offendersIn(src: string, file: string): string[] {
    const bad: string[] = [];
    const calls = [...src.matchAll(/\b(makeButton|gatedButton)\(/g)];
    for (let i = 0; i < calls.length; i++) {
      const start = calls[i]!.index!;
      const end = i + 1 < calls.length ? calls[i + 1]!.index! : src.length;
      if (calls[i]![1] === 'gatedButton') continue;
      const body = src.slice(start, end);
      for (const name of actionNames) {
        if (new RegExp(`\\b${name}\\(st[,)]`).test(body)) {
          const line = src.slice(0, start).split('\n').length;
          bad.push(`${file}:${line} calls ${name} from makeButton`);
        }
      }
    }
    return bad;
  }

  it('routes them all through gatedButton', () => {
    const bad = sceneFiles.flatMap((f) =>
      offendersIn(readFileSync(join(SCENE_DIR, f), 'utf8'), f),
    );
    expect(bad).toEqual([]);
  });
});

describe('the gate and the action agree', () => {
  it('never lets an action restate a condition it delegates', () => {
    // Two copies of one rule drift. `staffSkillBonus` drifted from
    // `treatment.ts` exactly this way, and the upgrade switch carried its own
    // duplicate of every price until `UPGRADE_SPECS` took over.
    //
    // The shape we require: the action's first statement is the check.
    const files = ['politics.ts', 'family.ts', 'staff.ts', 'travel.ts'];
    const bad: string[] = [];
    for (const f of files) {
      const src = readFileSync(join(SYS_DIR, f), 'utf8');
      for (const m of src.matchAll(
        /export function ([a-zA-Z]+)\([^)]*\)\s*:\s*boolean \{\n([^\n]*)\n/gs,
      )) {
        const [, name, firstLine] = m;
        if (NOT_ACTIONS.has(name!)) continue;
        if (!/if \(!can[A-Za-z]+\(/.test(firstLine!)) {
          bad.push(`${f}:${name} does not open with its check`);
        }
      }
    }
    expect(bad).toEqual([]);
  });
});
