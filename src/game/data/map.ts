import type { MapNode } from '../types';

/**
 * Travel nodes for Franconia and the Swabian marches.
 *
 * Note Augsburg is in the Duchy of Swabia, not Franconia — the previous header
 * claimed the whole set was Franconian.
 */
export const MAP_NODES: MapNode[] = [
  {
    id: 'road_camp',
    type: 'camp',
    x: 180,
    y: 480,
    connections: ['small_village', 'monastery_ebrach'],
    marketDay: -1,
    hasBathLicenseShop: false,
    travelCost: 0,
  },
  {
    id: 'small_village',
    type: 'village',
    x: 320,
    y: 400,
    connections: ['road_camp', 'rothenburg', 'nurnberg'],
    marketDay: 3,
    hasBathLicenseShop: false,
    travelCost: 2,
  },
  {
    id: 'monastery_ebrach',
    type: 'monastery',
    x: 260,
    y: 280,
    connections: ['road_camp', 'bamberg', 'nurnberg'],
    marketDay: 0,
    hasBathLicenseShop: false,
    travelCost: 3,
  },
  {
    id: 'rothenburg',
    type: 'town',
    x: 420,
    y: 520,
    connections: ['small_village', 'nurnberg', 'augsburg', 'wurzburg'],
    marketDay: 2,
    hasBathLicenseShop: true,
    travelCost: 4,
  },
  {
    id: 'nurnberg',
    type: 'city',
    x: 560,
    y: 360,
    connections: ['small_village', 'monastery_ebrach', 'rothenburg', 'bamberg', 'wurzburg', 'augsburg'],
    marketDay: 1,
    hasBathLicenseShop: true,
    travelCost: 5,
  },
  {
    id: 'bamberg',
    type: 'city',
    x: 480,
    y: 200,
    connections: ['monastery_ebrach', 'nurnberg', 'wurzburg'],
    marketDay: 4,
    hasBathLicenseShop: true,
    travelCost: 5,
  },
  {
    id: 'wurzburg',
    type: 'city',
    // West-north-west of Nürnberg (~100 km). Was at x:700, i.e. drawn *east*
    // of Nürnberg, which is geographically backwards.
    x: 330,
    y: 250,
    // The Tauber valley road to Rothenburg (~60 km) was a real and short
    // route; it was missing, while Rothenburg linked to Augsburg (~140 km).
    connections: ['nurnberg', 'bamberg', 'rothenburg'],
    marketDay: 5,
    hasBathLicenseShop: true,
    travelCost: 6,
  },
  {
    id: 'augsburg',
    type: 'city',
    x: 720,
    y: 520,
    connections: ['rothenburg', 'nurnberg', 'war_camp'],
    marketDay: 6,
    hasBathLicenseShop: true,
    travelCost: 7,
  },
  {
    id: 'war_camp',
    type: 'camp',
    x: 900,
    y: 480,
    connections: ['augsburg'],
    marketDay: -1,
    hasBathLicenseShop: false,
    travelCost: 8,
  },
];

export const MAP_NODE_MAP = Object.fromEntries(MAP_NODES.map((n) => [n.id, n]));

export function neighbors(id: string): string[] {
  return MAP_NODE_MAP[id]?.connections ?? [];
}
