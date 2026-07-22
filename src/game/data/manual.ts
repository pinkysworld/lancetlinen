import type { HistoricalSourceId } from './historicalSources';

export interface ManualChapter {
  id: string;
  titleKey: string;
  bodyKey: string;
  sourceIds: HistoricalSourceId[];
}

/** The in-game Manual mirrors docs/MANUAL.md. Keep this list at twelve chapters. */
export const MANUAL_CHAPTERS: ManualChapter[] = [
  { id: 'core', titleKey: 'manual_core', bodyKey: 'manual_core_body', sourceIds: ['game_simplification'] },
  { id: 'roles', titleKey: 'manual_roles', bodyKey: 'manual_roles_body', sourceIds: ['gnm_daily_life'] },
  { id: 'examinations', titleKey: 'manual_examinations', bodyKey: 'manual_examinations_body', sourceIds: ['wellcome_blood'] },
  { id: 'procedures', titleKey: 'manual_procedures', bodyKey: 'manual_procedures_body', sourceIds: ['wellcome_blood'] },
  { id: 'regimens', titleKey: 'manual_regimens', bodyKey: 'manual_regimens_body', sourceIds: ['wellcome_church'] },
  { id: 'complaints', titleKey: 'manual_complaints', bodyKey: 'manual_complaints_body', sourceIds: ['game_simplification'] },
  { id: 'bathhouse', titleKey: 'manual_bathhouse', bodyKey: 'manual_bathhouse_body', sourceIds: ['gnm_daily_life'] },
  { id: 'city', titleKey: 'manual_city', bodyKey: 'manual_city_body', sourceIds: ['gnm_daily_life'] },
  { id: 'household', titleKey: 'manual_household', bodyKey: 'manual_household_body', sourceIds: ['gnm_daily_life'] },
  { id: 'politics', titleKey: 'manual_politics', bodyKey: 'manual_politics_body', sourceIds: ['wellcome_church'] },
  { id: 'act3', titleKey: 'manual_act3', bodyKey: 'manual_act3_body', sourceIds: ['game_simplification'] },
  { id: 'sources', titleKey: 'manual_sources', bodyKey: 'manual_sources_body', sourceIds: ['gnm_daily_life', 'wellcome_church', 'wellcome_blood'] },
];
