import type { GameState, JournalEntry } from '../types';
import { normalizeI18nKey } from '../i18n';

let journalSeq = 0;

export function addJournal(
  state: GameState,
  textKey: string,
  category: JournalEntry['category'],
  params?: Record<string, string | number>,
): void {
  if (!state.journal) state.journal = [];
  journalSeq += 1;
  state.journal.unshift({
    id: `j-${state.day}-${journalSeq}`,
    day: state.day,
    year: state.year,
    // Always store underscore keys so journal UI never shows raw dotted ids
    textKey: normalizeI18nKey(textKey),
    params,
    category,
  });
  // Cap journal size
  if (state.journal.length > 80) state.journal.length = 80;
}

export function ensureJournal(state: GameState): void {
  if (!state.journal) state.journal = [];
}
