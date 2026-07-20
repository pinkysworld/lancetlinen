/**
 * Achievements.
 *
 * Evaluated against game state rather than fired from scattered call sites, so
 * adding one means adding a predicate here and nothing else. `check()` runs at
 * day end and after an ending; Steam ignores repeat unlocks, so there is no
 * need to remember what has already been granted — but we do anyway, cheaply,
 * to avoid the IPC round trip.
 *
 * The set is deliberately built around the honour axis rather than around
 * grinding: the interesting achievements are the ones that require choosing a
 * path, and two of them are mutually exclusive within a single run.
 *
 * Works without Steam. On the web build and DRM-free builds `unlock` is a
 * no-op and the local record is all that exists.
 */
import type { GameState } from '../types';
import { honour, HONOUR_CEILING } from './honour';

interface SteamBridge {
  available(): Promise<boolean>;
  unlock(apiName: string): Promise<boolean>;
  isUnlocked(apiName: string): Promise<boolean>;
  playerName(): Promise<string | null>;
}

declare global {
  interface Window {
    __lancetSteam?: SteamBridge;
  }
}

function bridge(): SteamBridge | null {
  return typeof window !== 'undefined' ? (window.__lancetSteam ?? null) : null;
}

export interface Achievement {
  /** Steamworks API name. Fixed forever once published — do not rename. */
  id: string;
  /** i18n key for the display name. */
  nameKey: string;
  descKey: string;
  /** Hidden achievements spoil less of the story on the store page. */
  hidden?: boolean;
  earned: (s: GameState) => boolean;
}

export const ACHIEVEMENTS: Achievement[] = [
  {
    id: 'FIRST_BLOOD',
    nameKey: 'ach_first_blood',
    descKey: 'ach_first_blood_desc',
    earned: (s) => s.totalTreated >= 1,
  },
  {
    id: 'HUNDRED_HANDS',
    nameKey: 'ach_hundred_hands',
    descKey: 'ach_hundred_hands_desc',
    earned: (s) => s.totalTreated >= 100,
  },
  {
    id: 'TOLERATED',
    nameKey: 'ach_tolerated',
    descKey: 'ach_tolerated_desc',
    earned: (s) => honour(s) >= 50,
  },
  {
    id: 'AS_HONEST_AS_ALLOWED',
    nameKey: 'ach_as_honest',
    descKey: 'ach_as_honest_desc',
    // The era's ceiling. Being unable to go further is the point.
    earned: (s) => honour(s) >= HONOUR_CEILING - 1,
  },
  {
    id: 'CLEAN_HANDS',
    nameKey: 'ach_clean_hands',
    descKey: 'ach_clean_hands_desc',
    // A full campaign without killing anyone — genuinely hard, not a gimme.
    earned: (s) => s.totalTreated >= 35 && s.deathsOnHands === 0,
  },
  {
    id: 'RICH_AND_INFAMOUS',
    nameKey: 'ach_rich_infamous',
    descKey: 'ach_rich_infamous_desc',
    hidden: true,
    // The other half of the tension: money bought at the cost of a name.
    earned: (s) => s.coin >= 2000 && honour(s) < 20,
  },
  {
    id: 'GUILD_BROTHER',
    nameKey: 'ach_guild_brother',
    descKey: 'ach_guild_brother_desc',
    // A Bader *starts* as an apprentice, so anything short of journeyman
    // would grant this before the player has done a thing.
    earned: (s) => s.guildRank === 'journeyman' || s.guildRank === 'master',
  },
  {
    id: 'COUNCIL_SEAT',
    nameKey: 'ach_council_seat',
    descKey: 'ach_council_seat_desc',
    hidden: true,
    earned: (s) => s.office === 'council_seat',
  },
  {
    id: 'PLAGUE_YEAR',
    nameKey: 'ach_plague_year',
    descKey: 'ach_plague_year_desc',
    // Staying to work an epidemic rather than travelling out of it.
    // Counts real saves, so it cannot be earned by waiting the plague out.
    earned: (s) => Number(s.storyFlags['epidemic_saves'] ?? 0) >= 5,
  },
  {
    id: 'THE_LINE_CONTINUES',
    nameKey: 'ach_line_continues',
    descKey: 'ach_line_continues_desc',
    hidden: true,
    earned: (s) => s.ending === 'dynasty',
  },
];

/** Local record, so a repeat check does not cross the IPC boundary. */
const granted = new Set<string>();

/**
 * Evaluate every achievement against the current state and unlock what is due.
 *
 * Returns the ids newly granted this call, so the caller can toast them.
 */
export function checkAchievements(s: GameState): string[] {
  const fresh: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (granted.has(a.id)) continue;
    let earned = false;
    try {
      earned = a.earned(s);
    } catch {
      // A predicate reading a field an old save lacks must not break day end.
      earned = false;
    }
    if (!earned) continue;
    granted.add(a.id);
    fresh.push(a.id);
    void bridge()?.unlock(a.id);
  }
  return fresh;
}

/** Seed the local record from Steam, so a returning player is not re-toasted. */
export async function syncAchievements(): Promise<void> {
  const steam = bridge();
  if (!steam) return;
  try {
    if (!(await steam.available())) return;
    for (const a of ACHIEVEMENTS) {
      if (await steam.isUnlocked(a.id)) granted.add(a.id);
    }
  } catch {
    /* Steam absent or misbehaving — local record stands. */
  }
}

/** For a future in-game achievements list. */
export function isGranted(id: string): boolean {
  return granted.has(id);
}
