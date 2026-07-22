/** Stable source identifiers shared by the Manual and the Lexicon. */
export type HistoricalSourceId =
  | 'gnm_daily_life'
  | 'wellcome_church'
  | 'wellcome_blood'
  | 'fugger_history'
  | 'medici_treccani'
  | 'met_trade'
  | 'vatican_borgia'
  | 'game_simplification';

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
    id: 'fugger_history',
    title: 'Fugger Foundations: History of the Fugger family since 1367',
    url: 'https://www.fugger.de/en/history',
  },
  {
    id: 'medici_treccani',
    title: 'Treccani: Giovanni di Bicci de’ Medici',
    url: 'https://www.treccani.it/enciclopedia/giovanni-di-bicci-de-medici_res-0d7a7119-9b6c-11e6-9e53-00271042e8d9_%28Dizionario-Biografico%29/',
  },
  {
    id: 'met_trade',
    title: 'Metropolitan Museum of Art: Medieval Islamic textiles and trade',
    url: 'https://www.metmuseum.org/perspectives/medieval-islamic-textiles-twentieth-century',
  },
  {
    id: 'vatican_borgia',
    title: 'The Vatican: Alexander VI (Rodrigo de Borja)',
    url: 'https://www.vatican.va/content/vatican/en/holy-father/alessandro-vi.html',
  },
  {
    id: 'game_simplification',
    title: 'Lancet & Linen: Spielvereinfachungen und Grenzen',
    url: 'docs/HISTORICAL_SOURCES.md#spielvereinfachungen',
  },
];

export function sourceById(id: HistoricalSourceId): HistoricalSource {
  return HISTORICAL_SOURCES.find((source) => source.id === id) ?? HISTORICAL_SOURCES.at(-1)!;
}
