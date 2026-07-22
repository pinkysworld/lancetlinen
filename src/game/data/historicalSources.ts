/** Stable source identifiers shared by the Manual and the Lexicon. */
export type HistoricalSourceId = 'gnm_daily_life' | 'wellcome_church' | 'wellcome_blood' | 'game_simplification';

export interface HistoricalSource {
  id: HistoricalSourceId;
  title: string;
  url: string;
}

export const HISTORICAL_SOURCES: HistoricalSource[] = [
  {
    id: 'gnm_daily_life',
    title: 'Germanisches Nationalmuseum: Leben und Sterben im Mittelalter',
    url: 'https://alltagimmittelalter.gnm.de/de/leben-und-sterben',
  },
  {
    id: 'wellcome_church',
    title: 'Wellcome Collection: Health and the medieval church',
    url: 'https://wellcomecollection.org/stories/health-and-the-medieval-church',
  },
  {
    id: 'wellcome_blood',
    title: 'Wellcome Collection: Bloodletting at the barber-surgeon’s',
    url: 'https://wellcomecollection.org/stories/bloodletting-at-the-barber-surgeon-s',
  },
  {
    id: 'game_simplification',
    title: 'Lancet & Linen: Spielvereinfachungen und Grenzen',
    url: 'docs/HISTORICAL_SOURCES.md#spielvereinfachungen',
  },
];

export function sourceById(id: HistoricalSourceId): HistoricalSource {
  return HISTORICAL_SOURCES.find((source) => source.id === id) ?? HISTORICAL_SOURCES[3]!;
}
